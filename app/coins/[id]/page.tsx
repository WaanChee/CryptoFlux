import Converter from "@/components/Converter";
import LiveDataWrapper from "@/components/LiveDataWrapper";
import { fetcher, getPools } from "@/lib/coingecko.actions";
import { formatCurrency } from "@/lib/utils";
import { ArrowUpRight } from "lucide-react";

const page = async ({ params }: NextPageProps) => {
  const { id } = await params;

  const [coinData, coinOHLCData] = await Promise.all([
    await fetcher<CoinDetailsData>(`/coins/${id}`, {
      dex_pair_format: "contract_address",
    }),

    await fetcher<OHLCData[]>(`/coins/${id}/ohlc`, {
      vs_currency: "USD",
      days: 1,
      //interval: "hourly", Only if you have pro subscription of CoinGecko API
      precision: "full",
    }),
  ]);

  const platform = coinData.asset_platform_id
    ? coinData.detail_platforms?.[coinData.asset_platform_id]
    : null;

  const network = (() => {
    const url = platform?.geckoterminal_url;
    if (!url) return null;

    try {
      const pathname = new URL(url).pathname;
      const segments = pathname.split("/").filter(Boolean);
      return segments[0] || null;
    } catch {
      return null;
    }
  })();

  const contractAddress = platform?.contract_address || null;

  const pool = await getPools(id, network, contractAddress);

  const coinDetails = [
    {
      label: "Market Cap",
      value: formatCurrency(coinData.market_data.market_cap.usd),
    },
    {
      label: "Market Cap Rank",
      value: `# ${coinData.market_cap_rank}`,
    },
    {
      label: "Total Volume",
      value: formatCurrency(coinData.market_data.total_volume.usd),
    },
    {
      label: "Website",
      value: "-",
      link: coinData.links.homepage[0],
      linkText: "Homepage",
    },
    {
      label: "Explorer",
      value: "-",
      link: coinData.links.blockchain_site[0],
      linkText: "Explorer",
    },
    {
      label: "Community",
      value: "-",
      link: coinData.links.subreddit_url,
      linkText: "Community",
    },
  ];
  return (
    <main id="coin-details-page">
      <section className="primary">
        <LiveDataWrapper
          coinId={id}
          poolId={pool.id}
          coin={coinData}
          coinOHLCData={coinOHLCData}
        >
          <h4>Exchange Listings</h4>
        </LiveDataWrapper>
      </section>

      <section className="secondary">
        <Converter
          symbol={coinData.symbol}
          icon={coinData.image.small}
          priceList={coinData.market_data.current_price}
        />

        <div className="details">
          <h4>Coin Details</h4>

          <ul className="details-grid">
            {coinDetails.map(({ label, value, link, linkText }, index) => (
              <li key={index}>
                <p className={label}>{label}</p>

                {link ? (
                  <div className="link">
                    <a href={link} target="_blank" rel="noreferrer">
                      {link}
                    </a>
                    <ArrowUpRight size={16} />
                  </div>
                ) : (
                  <p className="text-base font-medium">{value}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
};

export default page;
