"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import type { StudioProject } from "@/lib/webtoon-studio/types";
import type { StudioBrushPreset } from "@/lib/webtoon-studio/types";

export async function listCloudStudioProjects() {
  const user = await requireAuth();
  return db.webtoonStudioProject.findMany({
    where: { userId: user.id },
    orderBy: [{ favorite: "desc" }, { updatedAt: "desc" }],
    select: { id: true, name: true, favorite: true, updatedAt: true, createdAt: true },
  });
}

export async function loadCloudStudioProject(cloudId: string) {
  const user = await requireAuth();
  const row = await db.webtoonStudioProject.findFirst({
    where: { id: cloudId, userId: user.id },
  });
  if (!row) return { error: "프로젝트를 찾을 수 없습니다." };
  const data = row.data as StudioProject;
  return { project: { ...data, cloudId: row.id, favorite: row.favorite } as StudioProject };
}

export async function saveCloudStudioProject(project: StudioProject) {
  const user = await requireAuth();
  const payload = { ...project, updatedAt: new Date().toISOString() };
  if (project.cloudId) {
    await db.webtoonStudioProject.update({
      where: { id: project.cloudId, userId: user.id },
      data: { name: project.name, data: payload, favorite: project.favorite ?? false },
    });
    return { cloudId: project.cloudId };
  }
  const row = await db.webtoonStudioProject.create({
    data: {
      userId: user.id,
      name: project.name,
      data: payload,
      favorite: project.favorite ?? false,
    },
  });
  return { cloudId: row.id };
}

export async function deleteCloudStudioProject(cloudId: string) {
  const user = await requireAuth();
  await db.webtoonStudioProject.deleteMany({ where: { id: cloudId, userId: user.id } });
  return { success: true as const };
}

export async function toggleCloudProjectFavorite(cloudId: string, favorite: boolean) {
  const user = await requireAuth();
  await db.webtoonStudioProject.updateMany({
    where: { id: cloudId, userId: user.id },
    data: { favorite },
  });
  return { success: true as const };
}

export async function syncStudioSettings(input: {
  brushes: StudioBrushPreset[];
  palette: string[];
}) {
  const user = await requireAuth();
  await db.webtoonStudioSettings.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      brushes: input.brushes,
      palette: input.palette,
    },
    update: {
      brushes: input.brushes,
      palette: input.palette,
    },
  });
  return { success: true as const };
}

export async function getStudioSettings() {
  const user = await requireAuth();
  const row = await db.webtoonStudioSettings.findUnique({ where: { userId: user.id } });
  if (!row) return { brushes: [] as StudioBrushPreset[], palette: [] as string[] };
  return {
    brushes: (row.brushes as StudioBrushPreset[]) ?? [],
    palette: (row.palette as string[]) ?? [],
  };
}

export async function getWebtoonAuthorDashboard() {
  const user = await requireAuth();
  const series = await db.creatorSeries.findMany({
    where: { authorId: user.id, kind: "WEBTOON" },
    include: {
      episodes: {
        where: { published: true },
        select: {
          id: true,
          title: true,
          episodeNo: true,
          salesCount: true,
          viewCount: true,
          price: true,
          scheduledAt: true,
          createdAt: true,
        },
        orderBy: { episodeNo: "desc" },
      },
    },
  });

  const episodes = series.flatMap((s) => s.episodes.map((e) => ({ ...e, seriesTitle: s.title, seriesId: s.id })));
  const totalViews = episodes.reduce((a, e) => a + e.viewCount, 0);
  const totalSales = episodes.reduce((a, e) => a + e.salesCount, 0);
  const revenue = episodes.reduce((a, e) => a + e.salesCount * e.price, 0);

  return {
    seriesCount: series.length,
    episodeCount: episodes.length,
    totalViews,
    totalSales,
    revenue,
    episodes: episodes.slice(0, 20),
    upcoming: episodes.filter((e) => e.scheduledAt && e.scheduledAt > new Date()).slice(0, 10),
  };
}

export async function incrementEpisodeView(episodeId: string) {
  await db.creatorEpisode.updateMany({
    where: { id: episodeId, published: true },
    data: { viewCount: { increment: 1 } },
  });
}
