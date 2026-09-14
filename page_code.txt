import type { Metadata } from "next";
import HomeClient from "./home-client";

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const search = typeof params.search === "string" ? params.search : undefined;
  if (search) {
    const title = `Поиск: ${search}`;
    const description = `Результаты поиска "${search}" в интернет-магазине Oina.tj.`;
    return {
      title,
      description,
      openGraph: { title: `${title} — Oina.tj`, description },
      twitter: { title: `${title} — Oina.tj`, description },
    };
  }
  return {};
}

export default function Home() {
  return <HomeClient />;
}
