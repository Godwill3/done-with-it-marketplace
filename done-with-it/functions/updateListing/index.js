// UPDATE: PUT /listings/{id}  body: { pin, price?, status? }  (seller only, checked by PIN)
const crypto = require('crypto');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const out = (c, b) => ({ statusCode: c, body: JSON.stringify(b) });

exports.handler = async (e) => {
  const id = e.pathParameters.id;
  let d;
  try { d = JSON.parse(e.body || '{}'); } catch { return out(400, { error: 'Invalid JSON' }); }
  const r = await db.send(new GetCommand({ TableName: process.env.TABLE_NAME, Key: { id } }));
  if (!r.Item) return out(404, { error: 'Listing not found' });
  const given = crypto.createHash('sha256').update(id + String(d.pin || '')).digest('hex');
  if (!crypto.timingSafeEqual(Buffer.from(given), Buffer.from(r.Item.pinHash))) return out(403, { error: 'Wrong PIN' });

  const sets = [], names = {}, values = { ':u': new Date().toISOString() };
  if (d.price !== undefined) {
    const price = Number(d.price);
    if (!(price >= 0) || price > 100000000) return out(400, { error: 'Enter a valid price' });
    sets.push('#p = :p'); names['#p'] = 'price'; values[':p'] = price;
  }
  if (d.status !== undefined) {
    if (!['available', 'sold'].includes(d.status)) return out(400, { error: 'Invalid status' });
    sets.push('#s = :s'); names['#s'] = 'status'; values[':s'] = d.status;
  }
  if (!sets.length) return out(400, { error: 'Nothing to update' });
  const u = await db.send(new UpdateCommand({
    TableName: process.env.TABLE_NAME, Key: { id },
    UpdateExpression: 'SET ' + sets.join(', ') + ', updatedAt = :u',
    ExpressionAttributeNames: names, ExpressionAttributeValues: values, ReturnValues: 'ALL_NEW'
  }));
  const { pinHash, ...publicItem } = u.Attributes;
  return out(200, publicItem);
};
