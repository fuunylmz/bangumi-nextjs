type TmdbItem = {
  id: number;
  name?: string;
  title?: string;
  first_air_date?: string;
  release_date?: string;
  genre_ids?: number[];
};

type TmdbSearchResult = {
  results: TmdbItem[];
};

const isV4Token = (key: string) => key.startsWith("eyJ");

const buildParams = (apiKey: string) => {
  const params = new URLSearchParams();
  if (!isV4Token(apiKey)) {
    params.set("api_key", apiKey);
  }
  return params;
};

const buildHeaders = (apiKey: string): Record<string, string> => {
  if (isV4Token(apiKey)) {
    return {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json;charset=utf-8",
    };
  }
  return { "Content-Type": "application/json;charset=utf-8" };
};

const fetchTmdb = async (url: string, apiKey: string) => {
  const response = await fetch(url, {
    headers: buildHeaders(apiKey),
  });
  if (!response.ok) {
    return null;
  }
  return (await response.json()) as TmdbSearchResult;
};

export const searchTv = async (
  query: string,
  year: number | null,
  apiKey: string
) => {
  const languages = ["zh-CN", "ja-JP", "en-US"];
  for (const language of languages) {
    const baseParams = buildParams(apiKey);
    baseParams.set("query", query);
    baseParams.set("include_adult", "false");
    baseParams.set("language", language);
    if (year) baseParams.set("first_air_date_year", String(year));
    const url = `https://api.themoviedb.org/3/search/tv?${baseParams.toString()}`;
    const data = await fetchTmdb(url, apiKey);
    if (data?.results?.[0]) return data.results[0];
    if (year) {
      baseParams.delete("first_air_date_year");
      const retryUrl = `https://api.themoviedb.org/3/search/tv?${baseParams.toString()}`;
      const retryData = await fetchTmdb(retryUrl, apiKey);
      if (retryData?.results?.[0]) return retryData.results[0];
    }
  }
  return null;
};

export const searchMovie = async (
  query: string,
  year: number | null,
  apiKey: string
) => {
  const languages = ["zh-CN", "ja-JP", "en-US"];
  for (const language of languages) {
    const baseParams = buildParams(apiKey);
    baseParams.set("query", query);
    baseParams.set("include_adult", "false");
    baseParams.set("language", language);
    if (year) baseParams.set("year", String(year));
    const url = `https://api.themoviedb.org/3/search/movie?${baseParams.toString()}`;
    const data = await fetchTmdb(url, apiKey);
    if (data?.results?.[0]) return data.results[0];
    if (year) {
      baseParams.delete("year");
      const retryUrl = `https://api.themoviedb.org/3/search/movie?${baseParams.toString()}`;
      const retryData = await fetchTmdb(retryUrl, apiKey);
      if (retryData?.results?.[0]) return retryData.results[0];
    }
  }
  return null;
};

export const fetchDetail = async (
  type: "tv" | "movie",
  id: number,
  apiKey: string
) => {
  const languages = ["zh-CN", "ja-JP", "en-US"];
  for (const language of languages) {
    const params = buildParams(apiKey);
    params.set("language", language);
    const url = `https://api.themoviedb.org/3/${type}/${id}?${params.toString()}`;
    const response = await fetch(url, { headers: buildHeaders(apiKey) });
    if (!response.ok) continue;
    const data = await response.json();
    if (data?.id) return data;
  }
  return null;
};

export const isAnimationGenre = (genreIds?: number[]) =>
  Array.isArray(genreIds) && genreIds.includes(16);
