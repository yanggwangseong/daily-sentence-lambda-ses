import mysql from "mysql2/promise";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const sesClient = new SESClient({
  region: process.env.AWS_REGION,
});

export const generateEmailTemplate = (sentences, startDate, endDate) => {
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
    const weekday = weekdays[date.getDay()];
    return `${year}. ${month}. ${day}. (${weekday})`;
  };

  const formatPeriod = (start, end) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return `${startDate.getFullYear()}. ${String(
      startDate.getMonth() + 1
    ).padStart(2, "0")}. ${String(startDate.getDate()).padStart(
      2,
      "0"
    )}. ~ ${endDate.getFullYear()}. ${String(endDate.getMonth() + 1).padStart(
      2,
      "0"
    )}. ${String(endDate.getDate()).padStart(2, "0")}.`;
  };

  const sentenceItems = sentences
    .map((sentence) => {
      const date = formatDate(sentence.sentence_createdAt);
      const vocabDefinition = sentence.vocab_definition
        ? `<span style="font-size: 14px; color: #555;">${sentence.vocab_word}: ${sentence.vocab_definition}</span><br />`
        : "";

      return `
<span style="font-size: 14px; font-weight: 400; line-height: 3; color: #222;">
  <span style="font-size: 16px; font-weight: 600">📅 ${date}</span><br />
  <span style="font-size: 15px; color: #333;">"${
    sentence.sentence_sentence
  }" : ${sentence.sentence_meaning}</span><br />
  ${vocabDefinition}
  ${
    sentence.video_videoUrl
      ? `📺 <a href="${sentence.video_videoUrl}" target="_blank" style="color: #4b6bfb; text-decoration: none; font-size: 14px; font-weight: 500;">관련 영상 보기</a>`
      : ""
  }
</span>

<hr style="margin: 20px 0; border-color: #d9d9d9; border-style: solid; border-width: 1px 0 0 0;" />
`;
    })
    .join("");

  return `
<html>
  <head>
    <meta charset="UTF-8" />
  </head>
  <body>
    <div>
      <xlink rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.6/dist/web/variable/pretendardvariable.css">
      <table style="margin: 40px auto 20px; text-align: left; border-collapse: collapse; border: 0; width: 600px; padding: 64px 16px; box-sizing: border-box;">
        <tbody>
          <tr>
            <td>
              <a href="https://www.daily-sentence.co.kr" target="_blank" style="display: inline-block; font-size: 22px; font-weight: 600; color: #333; text-decoration: none;" rel="noreferrer noopener">
                매일영어
              </a>

              <p style="padding-top: 48px; font-weight: 700; font-size: 20px; line-height: 1.5; color: #222;">
                ${new Date(startDate).getMonth() + 1}월 ${Math.ceil(
    new Date(startDate).getDate() / 7
  )}주차 주간 영어 문장
              </p>
              <p style="font-size: 16px; font-weight: 400; line-height: 2; padding-top: 16px; color: #666;">
                ${formatPeriod(startDate, endDate)}<br/>
                🚀 매일 한 문장씩, 영어 실력이 쌓이는 Daily Sentence 안녕하세요! 바쁜 일상 속에서도<br/>
                꾸준히 영어 공부할 수 있는 Daily Sentence 서비스를 구독 해주셔서 감사합니다.<br/>
                ✈️ <a href="https://www.daily-sentence.co.kr" target="_blank" style="color: #4b6bfb; text-decoration: none; font-size: 14px; font-weight: 500;">사이트 바로 가기</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-top: 48px" colspan="2">
              <div style="padding: 24px; background: #f2f2f2; border-radius: 8px">
                ${sentenceItems}
              </div>
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td style="padding-top: 48px">
              <hr style="margin: 8px 0; border-color: #d9d9d9; border-style: solid; border-width: 1px 0 0 0;" />
            </td>
          </tr>
          <tr>
            <td style="padding-top: 8px; font-size: 12px; font-style: normal; font-weight: 400; line-height: 1.5; color: #222;">
              <p style="font-size: 14px; font-weight: 700">매일 영어</p>
              <p>이메일: dailysentence6@gmail.com</p>
              <a href="https://docs.google.com/forms/d/e/1FAIpQLSeacEjmcxGbEp9ZMQHUONgEj9scaJTLbEk0mREkbtS8x9WTtQ/viewform" target="_blank" style="color: #4b6bfb; text-decoration: none; font-size: 14px; font-weight: 500;">기능개선 및 버그 제보</a>
              <p>Copyright © ${new Date().getFullYear()}, 매일영어. All rights reserved.</p>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  </body>
</html>`;
};

export const getWeekDates = (inputDate) => {
  // 월요일을 주의 시작으로 계산 (1: 월요일, ..., 0: 일요일)
  const day = inputDate.getDay();
  const diff = day === 0 ? 6 : day - 1; // 일요일(0)이면 6을 빼고, 아니면 요일-1을 빼서 월요일로 맞춤

  // 월요일(시작일)
  const startDate = new Date(inputDate);
  startDate.setDate(inputDate.getDate() - diff);

  // 일요일(종료일)
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);

  const startDateStr = startDate.toLocaleDateString("sv-SE", {
    timeZone: "Asia/Seoul",
  });
  const endDateStr = endDate.toLocaleDateString("sv-SE", {
    timeZone: "Asia/Seoul",
  });

  return {
    startDate: startDateStr,
    endDate: endDateStr,
  };
};

export const connectionConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

export const getSentencesForWeek = async (startDate, endDate) => {
  const connection = await mysql.createConnection(connectionConfig);

  try {
    const [rows] = await connection.execute(
      `
      SELECT 
        sentence.id AS sentence_id,
        sentence.sentence AS sentence_sentence,
        sentence.meaning AS sentence_meaning,
        sentence.createdat AS sentence_createdAt,
        sentence.updatedat AS sentence_updatedAt,
        vocab.id AS vocab_id,
        vocab.word AS vocab_word,
        vocab.definition AS vocab_definition,
        vocab.createdat AS vocab_createdAt,
        vocab.updatedat AS vocab_updatedAt,
        vocab.sentenceid AS vocab_sentenceId,
        video.id AS video_id,
        video.videourl AS video_videoUrl,
        video.createdat AS video_createdAt,
        video.updatedat AS video_updatedAt
      FROM sentences sentence
      LEFT JOIN vocabs vocab ON vocab.sentenceid = sentence.id
      LEFT JOIN videos video ON video.id = sentence.videoid
      WHERE Date(sentence.createdat) BETWEEN ? AND ?
    `,
      [startDate, endDate]
    );
    const [emails] = await connection.execute(
      `
      SELECT 
        email
      FROM subscribers;
    `
    );

    return {
      sentences: rows,
      emails,
    };
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  } finally {
    await connection.end();
  }
};

export const handler = async () => {
  try {
    const { startDate, endDate } = getWeekDates(new Date());
    const { sentences, emails } = await getSentencesForWeek(startDate, endDate);

    const emailTemplate = generateEmailTemplate(sentences, startDate, endDate);

    const emailCommand = new SendEmailCommand({
      Destination: {
        CcAddresses: [],
        BccAddresses: [],
        ToAddresses: emails.map((email) => email.email),
      },
      Message: {
        Body: {
          Html: {
            Charset: "UTF-8",
            Data: emailTemplate,
          },
        },
        Subject: {
          Charset: "UTF-8",
          Data: `${new Date(startDate).getMonth() + 1}월 ${Math.ceil(
            new Date(startDate).getDate() / 7
          )}주차 주간 영어 문장`,
        },
      },
      Source: process.env.SENDER_EMAIL,
      ReplyToAddresses: [],
    });

    const response = await sesClient.send(emailCommand);
    console.log("메일 전송 완료\n", response.$metadata);

    return {
      statusCode: 200,
      body: JSON.stringify({
        startDate,
        endDate,
        sentences,
        emailTemplate,
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: String(error),
        stack: error && error.stack,
        details: error,
      }),
    };
  }
};
