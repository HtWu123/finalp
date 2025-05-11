// src/components/Filters/DateFilter.js
const DateFilter = ({ selectedDateRange, onDateRangeChange }) => {
  // Get the current date
  const now = new Date();
  
  // Create date options for last week, last month, last 3 months, last 6 months, and last year
  const dateRanges = [
    {
      value: 'all', 
      label: 'All Dates',
      range: null
    },
    {
      value: 'lastWeek',
      label: 'Last Week',
      range: {
        start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        end: now
      }
    },
    {
      value: 'lastMonth',
      label: 'Last Month',
      range: {
        start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        end: now
      }
    },
    {
      value: 'last3Months',
      label: 'Last 3 Months',
      range: {
        start: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
        end: now
      }
    },
    {
      value: 'last6Months',
      label: 'Last 6 Months',
      range: {
        start: new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000),
        end: now
      }
    },
    {
      value: 'lastYear',
      label: 'Last Year',
      range: {
        start: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
        end: now
      }
    }
  ];

  // Determine which value to select in the dropdown
  const getCurrentValue = () => {
    // If no date range is selected, return 'all'
    if (!selectedDateRange) return 'all';
    
    // Try to find the matching date range
    const matchingRange = dateRanges.find(range => {
      if (!range.range) return false;
      
      // Check if the selected range approximately matches one of our predefined ranges
      // We check within a small tolerance (1 minute) to account for potential small differences
      const tolerance = 60 * 1000; // 1 minute in milliseconds
      const startTimeDiff = Math.abs(
        (range.range.start?.getTime() || 0) - 
        (selectedDateRange.start?.getTime() || 0)
      );
      
      return startTimeDiff < tolerance;
    });
    
    return matchingRange ? matchingRange.value : 'all';
  };

  const handleChange = (e) => {
    const selectedValue = e.target.value;
    const selectedRange = dateRanges.find(range => range.value === selectedValue);
    onDateRangeChange(selectedRange ? selectedRange.range : null);
  };

  return (
    <div className="date-filter">
      <label htmlFor="date-select">Filter by Date: </label>
      <select 
        id="date-select" 
        value={getCurrentValue()} 
        onChange={handleChange}
        className="filter-select"
      >
        {dateRanges.map(range => (
          <option key={range.value} value={range.value}>
            {range.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default DateFilter;