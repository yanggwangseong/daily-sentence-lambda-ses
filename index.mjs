import mysql from "mysql2/promise";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const sesClient = new SESClient({ region: process.env.AWS_REGION });

function makeNewsletterHTML(sentences, periodTitle, periodRange) {
  return `
  <html>
  <head>
    <meta charset="UTF-8" />
    <style>
      body { font-family: 'Apple SD Gothic Neo', Arial, sans-serif; background: #fafbfc; margin: 0; padding: 0; }
      .container { max-width: 600px; margin: 30px auto; background: #fff; border-radius: 12px; box-shadow: 0 2px 8px #eee; padding: 32px 24px; }
      .header { text-align: center; margin-bottom: 32px; }
      .header h2 { margin: 0; font-size: 1.6em; }
      .header .period { color: #888; font-size: 1em; margin-top: 4px; }
      .sentence-block { border-bottom: 1px solid #f0f0f0; padding: 24px 0; }
      .sentence-block:last-child { border-bottom: none; }
      .date { color: #888; font-size: 1em; margin-bottom: 8px; }
      .main-sentence { font-size: 1.2em; font-weight: bold; margin-bottom: 6px; }
      .meaning { color: #333; margin-bottom: 6px; }
      .vocab { color: #555; font-size: 0.98em; margin-bottom: 6px; }
      .video-link { display: inline-block; margin-top: 6px; color: #2d6cdf; text-decoration: none; font-size: 0.98em; }
      @media (max-width: 650px) {
        .container { padding: 12px 4px; }
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h2>${periodTitle}</h2>
        <div class="period">${periodRange}</div>
      </div>
      ${sentences
        .map(
          (s) => `
        <div class="sentence-block">
          <div class="date">${s.date}</div>
          <div class="main-sentence">"${s.sentence}"</div>
          <div class="meaning">${s.meaning}</div>
          ${
            s.vocab && s.vocab.length
              ? `
            <div class="vocab">
              ${s.vocab
                .map((v) => `<span>${v.word}: ${v.definition}</span><br>`)
                .join("")}
            </div>
          `
              : ""
          }
          ${
            s.videoUrl
              ? `<a class="video-link" href="${s.videoUrl}" target="_blank">관련 영상 보기</a>`
              : ""
          }
        </div>
      `
        )
        .join("")}
    </div>
  </body>
  </html>
  `;
}

async function sendTestEmail(emailList, sentences, periodTitle, periodRange) {
  const htmlBody = makeNewsletterHTML(sentences, periodTitle, periodRange);

  const params = {
    Source: process.env.SENDER_EMAIL,
    Destination: {
      ToAddresses: emailList,
    },
    Message: {
      Subject: {
        Data: periodTitle,
        Charset: "UTF-8",
      },
      Body: {
        Html: {
          Data: htmlBody,
          Charset: "UTF-8",
        },
        Text: {
          Data: "내용이 보이지 않을 경우 https://www.daily-sentence.co.kr/weekly에서 확인 할 수 있습니다.",
          Charset: "UTF-8",
        },
      },
    },
  };

  try {
    const command = new SendEmailCommand(params);
    const result = await sesClient.send(command);
    return result;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
}

export const connectionConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

export async function dbOps() {
  const conn = await mysql.createConnection(connectionConfig);
  const [res] = await conn.execute("SELECT email FROM subscribers;");
  const { startDateStr, endDateStr } = await getCalculatedDate();
  const sentences = await getWeeklySentences(startDateStr, endDateStr);
  return {
    emailList: res.map((row) => row.email),
    sentences: sentences,
    startDate: startDateStr,
    endDate: endDateStr,
  };
}

export async function getCalculatedDate() {
  // 배치 스케줄러가 시작되는 날은 매주 월요일 오전 8시
  const inputDate = new Date();

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

  return { startDateStr, endDateStr };
}

export async function getWeeklySentences(startDateStr, endDateStr) {
  const conn = await mysql.createConnection(connectionConfig);

  const [res] = await conn.execute(
    "SELECT `sentence`.`id` AS `sentence_id`, `sentence`.`sentence` AS `sentence_sentence`, `sentence`.`meaning` AS `sentence_meaning`, `sentence`.`createdAt` AS `sentence_createdAt`, `sentence`.`updatedAt` AS `sentence_updatedAt`, `sentence`.`videoId` AS `sentence_videoId`, `vocab`.`id` AS `vocab_id`, `vocab`.`word` AS `vocab_word`, `vocab`.`definition` AS `vocab_definition`, `vocab`.`createdAt` AS `vocab_createdAt`, `vocab`.`updatedAt` AS `vocab_updatedAt`, `vocab`.`sentenceId` AS `vocab_sentenceId`, `video`.`id` AS `video_id`, `video`.`videoUrl` AS `video_videoUrl`, `video`.`createdAt` AS `video_createdAt`, `video`.`updatedAt` AS `video_updatedAt` FROM `sentences` `sentence` LEFT JOIN `vocabs` `vocab` ON `vocab`.`sentenceId`=`sentence`.`id` LEFT JOIN `videos` `video` ON `video`.`id`=`sentence`.`videoId` WHERE DATE(`sentence`.`createdAt`) BETWEEN ? AND ?",
    [startDateStr, endDateStr]
  );
  return res.map((sentence) => ({
    date: new Date(sentence.createdAt).toLocaleDateString("sv-SE", {
      timeZone: "Asia/Seoul",
    }),
    sentence: sentence.sentence,
    meaning: sentence.meaning,
    vocab: sentence.vocabs.map((v) => ({
      word: v.word,
      definition: v.definition,
    })),
    videoUrl: sentence.video?.videoUrl ?? "",
  }));
}

export function getKoreanWeekInfo(startDate, endDate) {
  // 몇월
  const month = startDate.getMonth() + 1;
  // 몇주차 계산
  const firstDayOfMonth = new Date(
    startDate.getFullYear(),
    startDate.getMonth(),
    1
  );
  const firstDayWeekDay =
    firstDayOfMonth.getDay() === 0 ? 7 : firstDayOfMonth.getDay(); // 일요일=7
  const offset = firstDayWeekDay === 1 ? 0 : 8 - firstDayWeekDay; // 첫 주의 월요일까지 며칠
  const firstMonday = new Date(firstDayOfMonth);
  firstMonday.setDate(firstDayOfMonth.getDate() + offset);

  let week = 1;
  let tempMonday = new Date(firstMonday);
  while (tempMonday < startDate) {
    tempMonday.setDate(tempMonday.getDate() + 7);
    week++;
  }

  // 기간 문자열
  const startStr = `${startDate.getFullYear()}. ${String(
    startDate.getMonth() + 1
  ).padStart(2, "0")}. ${String(startDate.getDate()).padStart(2, "0")}.`;
  const endStr = `${endDate.getFullYear()}. ${String(
    endDate.getMonth() + 1
  ).padStart(2, "0")}. ${String(endDate.getDate()).padStart(2, "0")}.`;

  return {
    periodTitle: `${month}월 ${week}주차<br>주간 영어 문장`,
    periodRange: `${startStr} ~ ${endStr}`,
  };
}

export const handler = async (event) => {
  try {
    // db에서 이메일 리스트 가져오기
    const dbResult = await dbOps();

    // 이메일 주소만 추출하여 배열로 변환
    const { emailList, sentences, startDate, endDate } = dbResult;
    // 주간 문장 가져오기
    const { periodTitle, periodRange } = getKoreanWeekInfo(startDate, endDate);
    const emailResult = await sendTestEmail(
      emailList,
      sentences,
      periodTitle,
      periodRange
    );

    const response = {
      statusCode: 200,
      body: JSON.stringify({
        emailList: emailList,
        emailResult: "Email sent successfully: " + emailResult.MessageId,
      }),
    };
    return response;
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message,
      }),
    };
  }
};
