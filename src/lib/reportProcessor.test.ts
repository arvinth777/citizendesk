import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processReportLogic } from './reportProcessor';
import { GoogleGenAI } from '@google/genai';
import { collection, query, where, getDocs, doc, setDoc, updateDoc, Timestamp, Firestore } from 'firebase/firestore';

vi.mock('firebase/firestore', () => {
  return {
    collection: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    getDocs: vi.fn(),
    doc: vi.fn(),
    setDoc: vi.fn(),
    updateDoc: vi.fn(),
    Timestamp: {
      now: vi.fn(() => ({ seconds: 1000, nanoseconds: 0 }))
    }
  };
});

describe('processReportLogic', () => {
  let mockDb: Firestore;
  let mockAi: any;
  let mockSendMessage: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {} as Firestore;
    
    mockSendMessage = vi.fn();
    mockAi = {
      chats: {
        create: vi.fn(() => ({
          sendMessage: mockSendMessage
        }))
      }
    };
  });

  it('handles a new standalone report correctly', async () => {
    // 1st Gemini response: classify issue
    mockSendMessage.mockResolvedValueOnce({
      functionCalls: [
        { id: '1', name: 'classify_issue', args: { category: 'pothole', severity: 3, summary: 'A pothole' } },
        { id: '2', name: 'check_duplicates', args: { lat: 40.7128, lng: -74.0060, category: 'pothole' } }
      ]
    });

    // Mock Firestore returning no duplicates
    (getDocs as any).mockResolvedValueOnce({ forEach: vi.fn() });

    // 2nd Gemini response: assign priority and draft escalation
    mockSendMessage.mockResolvedValueOnce({
      functionCalls: [
        { id: '3', name: 'assign_priority', args: { severity: 3, corroborationCount: 0, ageHours: 0 } },
        { id: '4', name: 'draft_escalation', args: { category: 'pothole', severity: 3, address: 'Test St', description: 'Big hole' } }
      ]
    });

    // 3rd Gemini response: done
    mockSendMessage.mockResolvedValueOnce({ functionCalls: [] });

    // Mock Firestore document creation
    (doc as any).mockReturnValue({ id: 'new-report-id' });

    const payload = {
      description: 'Big hole in the road',
      photoUrl: '',
      lat: 40.7128,
      lng: -74.0060,
      reporterId: 'user1',
      reporterName: 'John Doe',
      address: 'Test St'
    };

    const result = await processReportLogic(mockDb, mockAi, payload);

    expect(result).toEqual({
      message: 'Report submitted successfully.',
      isDuplicate: false,
      id: 'new-report-id'
    });
    
    expect(setDoc).toHaveBeenCalledTimes(1);
    const setDocArgs = vi.mocked(setDoc).mock.calls[0][1];
    expect(setDocArgs).toMatchObject({
      category: 'pothole',
      severity: 3,
      status: 'open',
      priorityScore: 30, // 3 * 10 + 0 + 0
      escalationSummary: 'Big hole'
    });
  });

  it('handles a duplicate report correctly', async () => {
    // 1st Gemini response: classify issue and check duplicates
    mockSendMessage.mockResolvedValueOnce({
      functionCalls: [
        { id: '1', name: 'classify_issue', args: { category: 'pothole', severity: 3, summary: 'A pothole' } },
        { id: '2', name: 'check_duplicates', args: { lat: 40.7128, lng: -74.0060, category: 'pothole' } }
      ]
    });

    // Mock Firestore returning a duplicate within 150m
    // Haversine dist formula is used, so we return exactly the same coords
    (getDocs as any).mockResolvedValueOnce({
      forEach: (cb: any) => {
        cb({ id: 'existing-dup-id', data: () => ({ lat: 40.7128, lng: -74.0060 }) });
      }
    });

    // 2nd Gemini response: agent decides to stop because a duplicate was found
    mockSendMessage.mockResolvedValueOnce({ functionCalls: [] });

    // Mock getDocs for fetching duplicate doc to update count
    (getDocs as any).mockResolvedValueOnce({
      empty: false,
      docs: [ { data: () => ({ corroborationCount: 5 }) } ]
    });

    (doc as any).mockReturnValue({ id: 'existing-dup-id' });

    const payload = {
      description: 'Big hole in the road',
      photoUrl: '',
      lat: 40.7128,
      lng: -74.0060,
      reporterId: 'user1',
      reporterName: 'John Doe',
      address: 'Test St'
    };

    const result = await processReportLogic(mockDb, mockAi, payload);

    expect(result).toEqual({
      message: 'This issue was already reported — your report helped confirm it.',
      isDuplicate: true
    });

    expect(updateDoc).toHaveBeenCalledTimes(1);
    expect(vi.mocked(updateDoc).mock.calls[0][1]).toEqual({
      corroborationCount: 6,
      status: 'verified'
    });
    expect(setDoc).not.toHaveBeenCalled();
  });
});
