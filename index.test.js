import * as indexModule from "./index.mjs";
import mysql from "mysql2/promise";

jest.mock("mysql2/promise");

const mockSentences = [
  {
    sentence_id: 1,
    sentence_sentence: "Test sentence",
    sentence_meaning: "테스트 문장",
    sentence_createdAt: "2025-05-12T00:00:00.000Z",
    vocab_word: "test",
    vocab_definition: "테스트",
    video_videoUrl: "https://example.com/video",
  },
  {
    sentence_id: 2,
    sentence_sentence: "Test sentence",
    sentence_meaning: "테스트 문장",
    sentence_createdAt: "2025-05-13T00:00:00.000Z",
    vocab_word: "test",
    vocab_definition: "테스트",
    video_videoUrl: "https://example.com/video",
  },
  {
    sentence_id: 3,
    sentence_sentence: "Test sentence",
    sentence_meaning: "테스트 문장",
    sentence_createdAt: "2025-05-14T00:00:00.000Z",
    vocab_word: "test",
    vocab_definition: "테스트",
    video_videoUrl: "https://example.com/video",
  },
  {
    sentence_id: 4,
    sentence_sentence: "Test sentence",
    sentence_meaning: "테스트 문장",
    sentence_createdAt: "2025-05-15T00:00:00.000Z",
    vocab_word: "test",
    vocab_definition: "테스트",
    video_videoUrl: "https://example.com/video",
  },
  {
    sentence_id: 5,
    sentence_sentence: "Test sentence",
    sentence_meaning: "테스트 문장",
    sentence_createdAt: "2025-05-16T00:00:00.000Z",
    vocab_word: "test",
    vocab_definition: "테스트",
    video_videoUrl: "https://example.com/video",
  },
  {
    sentence_id: 6,
    sentence_sentence: "Test sentence",
    sentence_meaning: "테스트 문장",
    sentence_createdAt: "2025-05-17T00:00:00.000Z",
    vocab_word: "test",
    vocab_definition: "테스트",
    video_videoUrl: "https://example.com/video",
  },
  {
    sentence_id: 7,
    sentence_sentence: "Test sentence",
    sentence_meaning: "테스트 문장",
    sentence_createdAt: "2025-05-18T00:00:00.000Z",
    vocab_word: "test",
    vocab_definition: "테스트",
    video_videoUrl: "https://example.com/video",
  },
];

describe("getWeekDates", () => {
  it("should return correct week dates for a Monday", () => {
    const monday = new Date("2025-05-12"); // 2025년 5월 12일 (월요일)
    const result = indexModule.getWeekDates(monday);

    expect(result.startDate).toBe("2025-05-12");
    expect(result.endDate).toBe("2025-05-18");
  });

  it("should return correct week dates for a Wednesday", () => {
    const wednesday = new Date("2025-05-14"); // 2025년 5월 14일 (수요일)
    const result = indexModule.getWeekDates(wednesday);

    expect(result.startDate).toBe("2025-05-12");
    expect(result.endDate).toBe("2025-05-18");
  });

  it("should return correct week dates for a Sunday", () => {
    const sunday = new Date("2025-05-18"); // 2025년 5월 18일 (일요일)
    const result = indexModule.getWeekDates(sunday);

    expect(result.startDate).toBe("2025-05-12");
    expect(result.endDate).toBe("2025-05-18");
  });
});

describe("getSentencesForWeek", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should fetch sentences and emails from database", async () => {
    const mockEmails = [
      { email: "test1@example.com" },
      { email: "test2@example.com" },
    ];

    const mockExecute = jest
      .fn()
      .mockResolvedValueOnce([mockSentences, []])
      .mockResolvedValueOnce([mockEmails, []]);

    const mockConnection = {
      execute: mockExecute,
      end: jest.fn().mockResolvedValue(undefined),
    };
    mysql.createConnection.mockResolvedValue(mockConnection);

    const result = await indexModule.getSentencesForWeek(
      "2025-05-12",
      "2025-05-18"
    );

    expect(result.sentences).toEqual(mockSentences);
    expect(result.emails).toEqual(mockEmails);
    expect(mockExecute).toHaveBeenCalledTimes(2);
  });

  it("should handle database errors", async () => {
    const mockError = new Error("Database connection failed");
    mysql.createConnection.mockRejectedValue(mockError);

    await expect(
      indexModule.getSentencesForWeek("2025-05-12", "2025-05-18")
    ).rejects.toThrow("Database connection failed");
  });
});

describe("generateEmailTemplate", () => {
  it("should generate correct HTML template with all elements", () => {
    const startDate = "2025-05-12";
    const endDate = "2025-05-18";

    const template = indexModule.generateEmailTemplate(
      mockSentences,
      startDate,
      endDate
    );

    // Check basic HTML structure
    expect(template).toContain("<html>");
    expect(template).toContain("<head>");
    expect(template).toContain("<body>");
    expect(template).toContain("</html>");

    // Check content
    expect(template).toContain("매일영어");
    expect(template).toContain("Test sentence");
    expect(template).toContain("테스트 문장");
    expect(template).toContain("test: 테스트");
    expect(template).toContain("https://example.com/video");
    expect(template).toContain("5월 2주차 주간 영어 문장");
    expect(template).toContain("2025. 05. 12. ~ 2025. 05. 18.");
  });

  it("should handle sentence without vocab and video", () => {
    const sentences = [
      {
        sentence_createdAt: "2025-05-12T00:00:00.000Z",
        sentence_sentence: "Simple sentence",
        sentence_meaning: "간단한 문장",
        vocab_word: null,
        vocab_definition: null,
        video_videoUrl: null,
      },
    ];

    const startDate = "2025-05-12";
    const endDate = "2025-05-18";

    const template = indexModule.generateEmailTemplate(
      sentences,
      startDate,
      endDate
    );

    expect(template).toContain("Simple sentence");
    expect(template).toContain("간단한 문장");
    expect(template).not.toContain("vocab_word");
    expect(template).not.toContain("video_videoUrl");
  });

  it("should format dates correctly in Korean", () => {
    const sentences = [
      {
        sentence_createdAt: "2025-05-12T00:00:00.000Z",
        sentence_sentence: "Test sentence",
        sentence_meaning: "테스트 문장",
      },
    ];

    const startDate = "2025-05-12";
    const endDate = "2025-05-18";

    const template = indexModule.generateEmailTemplate(
      sentences,
      startDate,
      endDate
    );

    expect(template).toContain("2025. 05. 12. (월)");
    expect(template).toContain("2025. 05. 12. ~ 2025. 05. 18.");
  });
});
