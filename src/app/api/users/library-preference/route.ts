import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { clampLibraryColumnCount } from "@/lib/library/columns";

const updateLibraryPreferenceSchema = z.object({
  columnCount: z.number()
});

export async function PUT(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const parsedRequest = updateLibraryPreferenceSchema.safeParse(body);

  if (!parsedRequest.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const libraryColumnCount = clampLibraryColumnCount(parsedRequest.data.columnCount);
  const updatedUser = await db.user.update({
    where: {
      id: user.id
    },
    data: {
      libraryColumnCount
    },
    select: {
      libraryColumnCount: true
    }
  });

  return NextResponse.json(updatedUser);
}
