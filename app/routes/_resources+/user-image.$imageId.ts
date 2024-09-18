import { type LoaderFunctionArgs } from '@remix-run/node';
import invariant from 'tiny-invariant';
import { db } from '~/db/index.server';

export async function loader({ params }: LoaderFunctionArgs) {
	const { imageId } = params;
	invariant(imageId, 'User imageId is required');

	const userImage = await db.query.userImages.findFirst({
		where: (table, { eq }) => eq(table.id, imageId),
	});

	if (!userImage) {
		return new Response('Not found', { status: 404 });
	}

	return new Response(userImage.blob, {
		headers: {
			'Content-Type': userImage.file_type,
			'Content-Length': userImage.size.toString(),
			'Content-disposition': `inline; filename=${userImage.name}`,
			'Cache-Control': 'public, max-age=31536000, immutable',
		},
	});
}
