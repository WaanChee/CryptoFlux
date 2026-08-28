"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "./ui/button";
import { searchCoins, getCoinsList } from "@/lib/coingecko.actions";
import { Search as SearchIcon, TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { cn, formatPercentage } from "@/lib/utils";
import useSWR from "swr";
import { useDebounce, useKey } from "react-use";

const TRENDING_LIMIT = 8;
const SEARCH_LIMIT = 10;

const SearchItem = ({ coin, onSelect, isActiveName }: SearchItemProps) => {
  const isSearchCoin =
    typeof coin.data?.price_change_percentage_24h === "number";

  const change = isSearchCoin
    ? ((coin as SearchCoin).data?.price_change_percentage_24h ?? 0)
    : ((coin as TrendingCoin["item"]).data.price_change_percentage_24h?.usd ??
      0);

  const changeClass = cn({
    "text-emerald-400": change > 0,
    "text-rose-400": change < 0,
    "text-gray-300": change === 0,
  });

  return (
    <CommandItem
      value={coin.id}
      onSelect={() => onSelect(coin.id)}
      className="search-item"
    >
      <div className="coin-info">
        <Image
          src={coin.thumb}
          alt={coin.name}
          width={40}
          height={40}
          className="rounded-full"
        />

        <div>
          <p
            className={cn(
              "font-semibold text-sm",
              isActiveName && "text-white"
            )}
          >
            {coin.name}
          </p>
          <p className="coin-symbol">{coin.symbol.toUpperCase()}</p>
        </div>
      </div>

      <div className={cn("coin-change", changeClass)}>
        {change > 0 ? (
          <TrendingUp size={14} className="inline-block" />
        ) : (
          <TrendingDown size={14} className="inline-block" />
        )}
        <span>{formatPercentage(Math.abs(change))}</span>
      </div>
    </CommandItem>
  );
};

export const SearchModal = ({
  initialTrendingCoins = [],
}: {
  initialTrendingCoins: TrendingCoin[];
}) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [lastResults, setLastResults] = useState<SearchCoin[]>([]);
  const [coinList, setCoinList] = useState<
    {
      id: string;
      name: string;
      symbol: string;
    }[]
  >([]);

  useDebounce(
    () => {
      setDebouncedQuery(searchQuery.trim());
    },
    200,
    [searchQuery]
  );

  // Prefer debouncedQuery, but fall back to current input so we fetch
  // suggestions while the user is still typing (improves perceived robustness).
  const searchKey = (debouncedQuery || searchQuery).trim().toLowerCase();

  const { data: searchResults = [], isValidating: isSearching } = useSWR<
    SearchCoin[]
  >(searchKey ? searchKey : null, (query) => searchCoins(query as string), {
    revalidateOnFocus: false,
  });

  const scoreResult = (coin: SearchCoin, query: string) => {
    const name = coin.name.toLowerCase();
    const symbol = coin.symbol.toLowerCase();
    const id = coin.id.toLowerCase();

    if (symbol === query) return 100;
    if (name === query) return 95;
    if (id === query) return 90;
    if (name.startsWith(query)) return 80;
    if (symbol.startsWith(query)) return 75;
    if (id.startsWith(query)) return 70;
    if (name.includes(query)) return 60;
    if (symbol.includes(query)) return 50;
    if (id.includes(query)) return 40;
    return 0;
  };

  useEffect(() => {
    if (searchResults && searchResults.length > 0) {
      setLastResults(searchResults);
    }
  }, [searchResults]);

  // Load full coin list once (cached in actions) for immediate client-side matches
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await getCoinsList();
        if (mounted) setCoinList(list || []);
      } catch {
        // ignore
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const computeVisibleResults = () => {
    const query = (debouncedQuery || searchQuery).trim().toLowerCase();
    const source = lastResults.length > 0 ? lastResults : searchResults;

    if (!query) return [] as SearchCoin[];

    const scored = source
      .map((coin) => ({ coin, score: scoreResult(coin, query) }))
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((s) => s.coin);

    if (scored.length > 0) return scored.slice(0, SEARCH_LIMIT);

    // If we have no enriched source results yet, fall back to the full coin list
    // to provide immediate matches (using a tiny placeholder image).
    if ((source == null || source.length === 0) && coinList.length > 0) {
      const dataUri =
        "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

      const localMatches = coinList
        .map((c) => ({
          id: c.id,
          name: c.name,
          symbol: c.symbol,
          market_cap_rank: null,
          thumb: dataUri,
          large: dataUri,
          data: { price: undefined, price_change_percentage_24h: 0 },
        }))
        .filter((coin) =>
          [coin.name, coin.symbol, coin.id].some((f) =>
            f.toLowerCase().includes(query)
          )
        )
        .map((coin) => ({
          coin,
          score: scoreResult(coin as SearchCoin, query),
        }))
        .sort((a, b) => b.score - a.score)
        .map((s) => s.coin as SearchCoin);

      return localMatches.slice(0, SEARCH_LIMIT);
    }

    const fallback = source.filter((coin) =>
      [coin.name, coin.symbol, coin.id].some((f) =>
        f.toLowerCase().includes(query)
      )
    );

    return fallback.slice(0, SEARCH_LIMIT);
  };

  const visibleSearchResults = computeVisibleResults();

  // Fallback: if SWR returned nothing and we're not currently validating,
  // try a direct client-side fetch once to recover results (helps noisy networks).
  useEffect(() => {
    let mounted = true;

    if (searchKey && !isSearching && visibleSearchResults.length === 0) {
      (async () => {
        try {
          const res = await searchCoins(searchKey);
          if (mounted && res && res.length > 0) setLastResults(res);
        } catch (e) {
          // ignore
        }
      })();
    }

    return () => {
      mounted = false;
    };
  }, [searchKey, isSearching]);

  useKey(
    (event) =>
      event.key?.toLowerCase() === "k" && (event.metaKey || event.ctrlKey),
    (event) => {
      event.preventDefault();
      setOpen((prev) => !prev);
    },
    {},
    [setOpen]
  );

  const handleSelect = (coinId: string) => {
    setOpen(false);
    setSearchQuery("");
    router.push(`/coins/${coinId}`);
  };

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
    }
  }, [open]);

  const hasQuery = searchKey.length > 0;
  const trendingCoins = initialTrendingCoins.slice(0, TRENDING_LIMIT);
  const showTrending = !hasQuery && trendingCoins.length > 0;

  const isSearchEmpty = !isSearching && !hasQuery && !showTrending;
  const isTrendingListVisible = !isSearching && showTrending;

  const isNoResults =
    !isSearching && hasQuery && visibleSearchResults.length === 0;
  const isResultsVisible =
    !isSearching && hasQuery && visibleSearchResults.length > 0;

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      className="dialog"
      data-search-modal
      trigger={
        <Button variant="ghost" className="trigger flex items-center gap-2">
          <SearchIcon size={18} />
          Search
          <kbd className="kbd">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>
      }
    >
      <div className="cmd-input">
        <CommandInput
          placeholder="Search for a token by name or symbol..."
          value={searchQuery}
          onValueChange={setSearchQuery}
        />
      </div>

      <CommandList className="list custom-scrollbar">
        {isSearching && <div className="empty">Searching...</div>}

        {isSearchEmpty && (
          <div className="empty">Type to search for coins...</div>
        )}

        {isTrendingListVisible && (
          <CommandGroup className="group">
            {trendingCoins.map(({ item }) => (
              <SearchItem
                key={item.id}
                coin={item}
                onSelect={handleSelect}
                isActiveName={false}
              />
            ))}
          </CommandGroup>
        )}

        {isNoResults && <CommandEmpty>No coins found.</CommandEmpty>}

        {isResultsVisible && (
          <CommandGroup
            heading={<p className="heading">Search Results</p>}
            className="group"
          >
            {visibleSearchResults.map((coin) => (
              <SearchItem
                key={coin.id}
                coin={coin}
                onSelect={handleSelect}
                isActiveName
              />
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
};
