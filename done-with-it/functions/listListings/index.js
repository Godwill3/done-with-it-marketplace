// READ: GET /listings  (available items only, newest first, PIN hash never returned)
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));

exports.handler = async () => {
  let items = [], key;
  do {
    const r = await db.send(new ScanCommand({ TableName: process.env.TABLE_NAME, ExclusiveStartKey: key }));
    items = items.concat(r.Items || []);
    key = r.LastEvaluatedKey;
  } while (key);
  const visible = items
    .filter((i) => i.status === 'available')
    .map(({ pinHash, ...rest }) => rest)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { statusCode: 200, body: JSON.stringify(visible) };
};
