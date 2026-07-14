import DataTable from "@/components/DataTable";

const placeholderRows = Array.from({ length: 4 }, (_, index) => ({
  id: index + 1,
}));

export const CoinOverviewFallback = () => {
  return (
    <div id="coin-overview-fallback">
      <div className="header">
        <div className="header-image skeleton" />

        <div className="info">
          <div className="header-line-sm skeleton" />
          <div className="header-line-lg skeleton" />
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <div className="period-button-skeleton skeleton" />
        <div className="period-button-skeleton skeleton" />
        <div className="period-button-skeleton skeleton" />
      </div>

      <div className="chart mt-4">
        <div className="chart-skeleton skeleton" />
      </div>
    </div>
  );
};

export const TrendingCoinFallback = () => {
  const columns: DataTableColumn<{ id: number }>[] = [
    {
      header: "Name",
      cellClassName: "name-cell",
      cell: () => (
        <div className="name-link">
          <div className="name-image skeleton" />
          <div className="name-line skeleton" />
        </div>
      ),
    },
    {
      header: "24h Change",
      cellClassName: "change-cell",
      cell: () => (
        <div className="flex items-center gap-2">
          <div className="change-icon skeleton" />
          <div className="change-line skeleton" />
        </div>
      ),
    },
    {
      header: "Price",
      cellClassName: "price-cell",
      cell: () => <div className="price-line skeleton" />,
    },
  ];

  return (
    <div id="trending-coins-fallback">
      <h4>Trending Coins</h4>

      <DataTable
        data={placeholderRows}
        columns={columns}
        rowKey={(row) => row.id}
        tableClassName="trending-coins-table"
        headerClassName="py-3!"
        bodyCellClassName="py-2!"
      />
    </div>
  );
};
