import { z } from 'zod';

const PexelsPhotoSchema = z.object({
  src: z.object({
    large: z.string(),
  }),
  photographer: z.string(),
  photographer_url: z.string(),
});

const PexelsResponseSchema = z.object({
  photos: z.array(PexelsPhotoSchema),
});

const ImageResultSchema = z.object({
  url: z.string(),
  attribution: z.string(),
});

export type ImageResult = z.infer<typeof ImageResultSchema>;

export async function searchImages(query: string): Promise<ImageResult[]> {
  const apiKey = process.env['PEXELS_API_KEY'];
  if (!apiKey) throw new Error('PEXELS_API_KEY not set');

  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=4`;

  const response = await fetch(url, {
    headers: { Authorization: apiKey },
  });

  if (!response.ok) {
    throw new Error(`Pexels ${response.status}: ${await response.text()}`);
  }

  const data = PexelsResponseSchema.parse(await response.json());

  return data.photos.map((photo) =>
    ImageResultSchema.parse({
      url: photo.src.large,
      attribution: `${photo.photographer} (${photo.photographer_url})`,
    }),
  );
}
