import qs from "query-string";

export async function fetcher<T>(
  endpoint: string,
  params?: QueryParams,
  revalidate = 60
): Promise<T> {
  const BASE_URL = process.env.COINGECKO_BASE_URL;
  const API_KEY = process.env.COINGECKO_API_KEY;

  if (!BASE_URL) throw new Error("Could not get base url");

  if (!API_KEY) throw new Error("Could not get api key");

  const url = qs.stringifyUrl(
    {
      url: `${BASE_URL}${endpoint}`,
      query: params,
    },
    { skipEmptyString: true, skipNull: true }
  );

  const response = await fetch(url, {
    headers: {
      "x-cg-demo-api-key": API_KEY,
      "Content-Type": "application/json",
    } as Record<string, string>,
    next: { revalidate },
  });

  if (!response.ok) {
    const errorBody: CoinGeckoErrorBody = await response
      .json()
      .catch(() => ({}));

    throw new Error(
      `API Error: ${response.status}: ${errorBody.error || response.statusText}`
    );
  }

  return response.json();
}

export async function getPools(
  id: string,
  network?: string | null,
  contractAddress?: string | null
): Promise<PoolData> {
  const fallback: PoolData = {
    id: "",
    address: "",
    name: "",
    network: "",
  };

  try {
    if (network && contractAddress) {
      const poolData = await fetcher<{ data: PoolData[] }>(
        `/onchain/networks/${network}/tokens/${contractAddress}/pools`
      );

      return poolData.data?.[0] ?? fallback;
    }

    const poolData = await fetcher<{ data: PoolData[] }>(
      "/onchain/search/pools",
      { query: id }
    );

    return poolData.data?.[0] ?? fallback;
  } catch {
    return fallback;
  }
}

export async function searchCoins(query: string): Promise<SearchCoin[]> {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return [];
  }

  const BASE_URL =
    process.env.NEXT_PUBLIC_COINGECKO_BASE_URL ??
    "https://api.coingecko.com/api/v3";

  try {
    const searchResponse = await fetch(
      `${BASE_URL}/search?query=${encodeURIComponent(trimmedQuery)}`
    );

    if (!searchResponse.ok) {
      return [];
    }

    const parsedSearch = await searchResponse.json();
    const coins: Array<{
      id: string;
      name: string;
      symbol: string;
      market_cap_rank: number | null;
      thumb: string;
      large: string;
    }> = parsedSearch.coins ?? [];

    const ids = coins
      .slice(0, 10)
      .map((coin) => coin.id)
      .filter(Boolean);

    if (ids.length === 0) {
      return [];
    }

    const marketResponse = await fetch(
      `${BASE_URL}/coins/markets?vs_currency=usd&ids=${encodeURIComponent(
        ids.join(",")
      )}&order=market_cap_desc&per_page=${ids.length}&page=1&price_change_percentage=24h`
    );

    if (!marketResponse.ok) {
      return [];
    }

    const marketData: CoinMarketData[] = await marketResponse.json();
    const marketById = new Map(marketData.map((item) => [item.id, item]));

    return coins.map((coin) => {
      const market = marketById.get(coin.id);

      return {
        id: coin.id,
        name: coin.name,
        symbol: coin.symbol,
        market_cap_rank: coin.market_cap_rank,
        thumb: coin.thumb,
        large: coin.large,
        data: {
          price: market?.current_price,
          price_change_percentage_24h: market?.price_change_percentage_24h ?? 0,
        },
      };
    });
  } catch {
    return [];
  }
}

let COIN_LIST_CACHE: { id: string; name: string; symbol: string }[] | null =
  null;

export async function getCoinsList(): Promise<
  { id: string; name: string; symbol: string }[]
> {
  if (COIN_LIST_CACHE) return COIN_LIST_CACHE;

  const BASE_URL =
    process.env.NEXT_PUBLIC_COINGECKO_BASE_URL ??
    "https://api.coingecko.com/api/v3";

  try {
    const res = await fetch(`${BASE_URL}/coins/list`);
    if (!res.ok) return [];
    const data: Array<{ id: string; symbol: string; name: string }> =
      await res.json();
    COIN_LIST_CACHE = data.map((c) => ({
      id: c.id,
      name: c.name,
      symbol: c.symbol,
    }));
    return COIN_LIST_CACHE;
  } catch {
    return [];
  }
}
