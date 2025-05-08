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
  
    const handleChange = (e) => {
      const selectedValue = e.target.value;
      const selectedRange = dateRanges.find(range => range.value === selectedValue);
      onDateRangeChange(selectedRange ? selectedRange.range : null);
    };
  
    // 缺少的返回部分
    return (
      <div className="date-filter">
        <label htmlFor="date-select">Filter by Date: </label>
        <select 
          id="date-select" 
          value={selectedDateRange ? dateRanges.find(r => 
            r.range && selectedDateRange.start && 
            r.range.start.getTime() === selectedDateRange.start.getTime())?.value || 'all' : 'all'} 
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