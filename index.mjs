import mysql from "mysql2/promise";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const sesClient = new SESClient({ region: process.env.AWS_REGION });

async function sendTestEmail(emailList, sentences) {
  const params = {
    Source: process.env.SENDER_EMAIL,
    Destination: {
      ToAddresses: emailList,
    },
    Message: {
      Subject: {
        Data: "Test Email from Lambda",
        Charset: "UTF-8",
      },
      Body: {
        Text: {
          Data: "This is a test email sent from AWS Lambda using SES",
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

async function dbOps() {
  const connectionConfig = {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  };

  const conn = await mysql.createConnection(connectionConfig);
  const [res] = await conn.execute("SELECT email FROM subscribers;");
  const sentences = await getWeeklySentences();
  return {
    emailList: res.map((row) => row.email),
    sentences: sentences,
  };
}

async function getWeeklySentences() {
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

export const handler = async (event) => {
  try {
    // db에서 이메일 리스트 가져오기
    const dbResult = await dbOps();

    // 이메일 주소만 추출하여 배열로 변환
    const emailList = dbResult.emailList;
    // 주간 문장 가져오기
    const sentences = dbResult.sentences;
    // SES 이메일 전송 테스트
    const emailResult = await sendTestEmail(emailList, sentences);

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
