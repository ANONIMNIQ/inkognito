import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface SearchBarProps {
  onSearch: (query: string) => void;
  initialQuery: string;
}

const DEBOUNCE_DELAY = 300; // 300ms delay

const SearchBar: React.FC<SearchBarProps> = ({ onSearch, initialQuery }) => {
  const [inputValue, setInputValue] = useState(initialQuery);
  const isMobile = useIsMobile();
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync local input value if the initialQuery from URL changes
  useEffect(() => {
    setInputValue(initialQuery);
  }, [initialQuery]);

  // Debounce effect for real-time search
  useEffect(() => {
    // Clear the previous timeout if the user is still typing
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set a new timeout to trigger the search after the user stops typing
    debounceTimeoutRef.current = setTimeout(() => {
      // Only trigger search if the debounced value is different from the initial prop
      // This prevents re-triggering a search on component mount
      if (inputValue !== initialQuery) {
        onSearch(inputValue.trim());
      }
    }, DEBOUNCE_DELAY);

    // Cleanup function to clear the timeout if the component unmounts
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [inputValue, initialQuery, onSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Clear any pending debounce and trigger search immediately
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    onSearch(inputValue.trim());
  };

  const handleClear = () => {
    setInputValue('');
    // The useEffect will trigger the debounced onSearch('') call
  };

  if (isMobile) {
    return null;
  }

  return (
    <div className="w-full max-w-2xl mx-auto mb-6">
      <form onSubmit={handleSubmit} className="relative flex items-center">
        <Search className="absolute left-3 h-5 w-5 text-gray-400" />
        <Input
          type="text"
          placeholder="Търсене в изповеди..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="w-full pl-10 pr-10 py-2 rounded-full bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400"
        />
        {inputValue && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-9 h-8 w-8 rounded-full"
            onClick={handleClear}
          >
            <X className="h-4 w-4 text-gray-500" />
          </Button>
        )}
        <Button
          type="submit"
          variant="ghost"
          size="icon"
          className="absolute right-1 h-8 w-8 rounded-full"
        >
          <Search className="h-5 w-5" />
        </Button>
      </form>
    </div>
  );
};

export default SearchBar;