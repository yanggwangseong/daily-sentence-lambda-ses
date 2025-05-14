import mysql from "mysql2/promise";

async function dbOps() {
  const connectionConfig = {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  };

  const conn = await mysql.createConnection(connectionConfig);
  const [res] = await conn.execute("SELECT ?+? AS sum", [3, 2]);
  return res;
}

export const handler = async (event) => {
  // db 연동 테스트
  const result = await dbOps();

  const response = {
    statusCode: 200,
    body: JSON.stringify("The selected sum is: " + result[0].sum),
  };
  return response;
};
