// DELETE: DELETE /listings/{id}  body: { pin }  (seller only; also removes the photo)
const crypto = require('crypto');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3 = new S3Client({});
const out = (c, b) => ({ statusCode: c, body: JSON.stringify(b) });

exports.handler = async (e) => {
  const id = e.pathParameters.id;
  let d;
  try { d = JSON.parse(e.body || '{}'); } catch { return out(400, { error: 'Invalid JSON' }); }
  const r = await db.send(new GetCommand({ TableName: process.env.TABLE_NAME, Key: { id } }));
  if (!r.Item) return out(404, { error: 'Listing not found' });
  const given = crypto.createHash('sha256').update(id + String(d.pin || '')).digest('hex');
  if (!crypto.timingSafeEqual(Buffer.from(given), Buffer.from(r.Item.pinHash))) return out(403, { error: 'Wrong PIN' });
  await s3.send(new DeleteObjectCommand({ Bucket: process.env.BUCKET, Key: `images/${id}.jpg` }));
  await db.send(new DeleteCommand({ TableName: process.env.TABLE_NAME, Key: { id } }));
  return { statusCode: 204, body: '' };
};
