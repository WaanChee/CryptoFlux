"use client";

import { Search as SearchIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SearchModal } from "@/components/SearchModal";

const SearchBar = () => {
  return (
    <div className="search-bar">
      <SearchModal initialTrendingCoins={[]} />
    </div>
  );
};

export default SearchBar;
