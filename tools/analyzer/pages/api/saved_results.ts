// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { MeCab, Word } from 'mecab-client';
import { createClient } from 'redis';

type Item = {
  time: string;
  word: Word;
};
export type Data = {
  error?: {
    message: string;
  };
  data?: {
    [name: string]: {
      result: Item[];
    }
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method?.toLocaleLowerCase() !== 'get') {
    return res.status(405).json({
      error: {
        message: '405 Method Not Allowed'
      }
    });
  }

  const client = createClient({
    url: 'redis://redis:6379'
  });
  client.on('error', (err) => console.log('Redis Client Error', err));
  await client.connect();

  const results = await client.hGetAll('results');

  res.status(200).json({
    data: Object.keys(results).reduce<{[k: string]: {result: Item[]}}>((prev, key) => {
      prev[key] = {result: JSON.parse(results[key])};
      return prev;
    }, {})
  });
}
