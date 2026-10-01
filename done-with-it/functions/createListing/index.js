// CREATE: POST /listings  (saves the photo to S3 and the listing to DynamoDB)
const crypto = require('crypto');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3 = new S3Client({});
const out = (c, b) => ({ statusCode: c, body: JSON.stringify(b) });
const clean = (v, n) => String(v || '').trim().slice(0, n);
const CONDITIONS = ['Like new', 'Good', 'Fair'];

exports.handler = async (e) => {
  let d;
  try { d = JSON.parse(e.body || '{}'); } catch { return out(400, { error: 'Invalid JSON' }); }
  const title = clean(d.title, 80), description = clean(d.description, 500);
  const location = clean(d.location, 60), sellerName = clean(d.sellerName, 60);
  const price = Number(d.price);
  const whatsapp = String(d.whatsapp || '').replace(/\D/g, '');
  const pin = String(d.pin || '');
  const image = String(d.image || '');

  if (!title || !sellerName) return out(400, { error: 'Title and your name are required' });
  if (!(price >= 0) || price > 100000000) return out(400, { error: 'Enter a valid price' });
  if (!CONDITIONS.includes(d.condition)) return out(400, { error: 'Choose a condition' });
  if (whatsapp.length < 8 || whatsapp.length > 15) return out(400, { error: 'Enter your WhatsApp number with country code' });
  if (pin.length < 4 || pin.length > 20) return out(400, { error: 'PIN must be 4 to 20 characters' });
  if (!image.startsWith('/9j/') || image.length > 1500000) return out(400, { error: 'Photo must be a JPEG under about 1 MB' });

  const id = crypto.randomUUID();
  await s3.send(new PutObjectCommand({
    Bucket: process.env.BUCKET, Key: `images/${id}.jpg`, Body: Buffer.from(image, 'base64'),
    ContentType: 'image/jpeg', CacheControl: 'max-age=31536000'
  }));
  const now = new Date().toISOString();
  const item = {
    id, title, description, price, condition: d.condition, location, sellerName, whatsapp,
    status: 'available', createdAt: now, updatedAt: now,
    imageUrl: `https://${process.env.BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/images/${id}.jpg`,
    pinHash: crypto.createHash('sha256').update(id + pin).digest('hex')
  };
  await db.send(new PutCommand({ TableName: process.env.TABLE_NAME, Item: item }));
  const { pinHash, ...publicItem } = item;
  return out(201, publicItem);
};
