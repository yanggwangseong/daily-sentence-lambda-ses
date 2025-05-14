import * as indexModule from "./index.mjs";
import mysql from "mysql2/promise";

jest.mock("mysql2/promise");

describe("dbOps", () => {
  it("should return emails and sentences (with internal functions mocked)", async () => {
    // 1. DB connection mock
    const mockExecute = jest
      .fn()
      // 첫 번째 쿼리: SELECT email FROM subscribers;
      .mockResolvedValueOnce([[{ email: "test@example.com" }], []])
      // 두 번째 쿼리: SELECT ... FROM sentences ...
      .mockResolvedValueOnce([
        [
          {
            createdAt: "2025-05-12T00:00:00.000Z",
            sentence: "Mocked sentence",
            meaning: "Mocked meaning",
            vocabs: [],
            videoUrl: "https://example.com/video",
          },
        ],
        [],
      ]);

    const mockConnection = { execute: mockExecute };
    mysql.createConnection.mockResolvedValue(mockConnection);

    // 2. getCalculatedDate mock
    const mockStartDateStr = "2025-05-12";
    const mockEndDateStr = "2025-05-18";
    jest.spyOn(indexModule, "getCalculatedDate").mockResolvedValue({
      startDateStr: mockStartDateStr,
      endDateStr: mockEndDateStr,
    });

    // 3. getWeeklySentences mock
    const mockSentences = [
      {
        date: mockStartDateStr,
        sentence: "Mocked sentence",
        meaning: "Mocked meaning",
        vocab: [],
        videoUrl: "",
      },
    ];
    jest
      .spyOn(indexModule, "getWeeklySentences")
      .mockResolvedValue(mockSentences);

    // 4. dbOps 호출
    const result = await indexModule.dbOps();

    expect(result.emailList).toEqual(["test@example.com"]);
    expect(result.sentences).toEqual(mockSentences);
    expect(result.startDate).toBe(mockStartDateStr);
    expect(result.endDate).toBe(mockEndDateStr);
  });
});

describe("getKoreanWeekInfo", () => {
  it("should return 5월 3주차 주간 영어 문장", () => {
    const startDate = new Date("2025-05-12");
    const endDate = new Date("2025-05-18");
    const { periodTitle, periodRange } = indexModule.getKoreanWeekInfo(
      startDate,
      endDate
    );

    expect(periodTitle).toBe("5월 3주차<br>주간 영어 문장");
    expect(periodRange).toBe("2025. 05. 12. ~ 2025. 05. 18.");
  });

  it("should return 6월 1주차 주간 영어 문장", () => {
    const startDate = new Date("2025-06-01");
    const endDate = new Date("2025-06-07");
    const { periodTitle, periodRange } = indexModule.getKoreanWeekInfo(
      startDate,
      endDate
    );

    expect(periodTitle).toBe("6월 1주차<br>주간 영어 문장");
  });

  it("should return 6월 2주차 주간 영어 문장", () => {
    const startDate = new Date("2025-06-08");
    const endDate = new Date("2025-06-14");
    const { periodTitle, periodRange } = indexModule.getKoreanWeekInfo(
      startDate,
      endDate
    );

    expect(periodTitle).toBe("6월 2주차<br>주간 영어 문장");
  });

  it("should return 6월 3주차 주간 영어 문장", () => {
    const startDate = new Date("2025-06-15");
    const endDate = new Date("2025-06-21");
    const { periodTitle, periodRange } = indexModule.getKoreanWeekInfo(
      startDate,
      endDate
    );

    expect(periodTitle).toBe("6월 3주차<br>주간 영어 문장");
  });
});
