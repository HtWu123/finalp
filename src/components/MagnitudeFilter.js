// src/components/Filters/MagnitudeFilter.js
const MagnitudeFilter = ({ selectedMagnitude, onMagnitudeChange }) => {
    const magnitudeLevels = [
      { value: 'All', label: 'All Magnitudes' },
      { value: 'Moderate (4.5-4.9)', label: 'Moderate (4.5-4.9)' },
      { value: 'Strong (5.0-5.9)', label: 'Strong (5.0-5.9)' },
      { value: 'Major (6.0-6.9)', label: 'Major (6.0-6.9)' },
      { value: 'Great (7.0+)', label: 'Great (7.0+)' }
    ];
  
    return (
      <div className="magnitude-filter">
        <label htmlFor="magnitude-select">Filter by Magnitude: </label>
        <select 
          id="magnitude-select" 
          value={selectedMagnitude} 
          onChange={(e) => onMagnitudeChange(e.target.value)}
          className="filter-select"
        >
          {magnitudeLevels.map(level => (
            <option key={level.value} value={level.value}>
              {level.label}
            </option>
          ))}
        </select>
      </div>
    );
  };
  
  export default MagnitudeFilter;
  