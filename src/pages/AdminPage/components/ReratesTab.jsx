  import api from '@/utils/api';
  import '../css/announcementpage.css';

  const ReratesTab = ({ levels, selectedLevels, onCheckboxChange, isLoading, onRemove, onEdit }) => (
    <div className="announcement-section">
      <div className="items-list">
        {levels.length > 0 ? (
          levels.map(level => (
            <div key={level.id} className="announcement-item">
              <label className="checkbox-container">
                <input
                  type="checkbox"
                  checked={selectedLevels.includes(level.id)}
                  onChange={() => onCheckboxChange(level.id)}
                  disabled={isLoading}
                />
                <span className="checkmark"></span>
                <div className="item-details">
                  <div className="item-title">
                    {level.song} - {level.artist}
                  </div>
                  <div className="item-subtitle">
                    {level.previousDifficulty?.name} ➔ {level.difficulty?.name}
                    {level.team && ` • ${level.team}`}
                  </div>
                </div>
              </label>
              <div className="button-group">
                <button 
                  className="edit-button"
                  onClick={() => onEdit(level)}
                  disabled={isLoading}
                  style ={{width: '40px', height: '40px'}}
                >
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M11 4H7.2C6.0799 4 5.51984 4 5.09202 4.21799C4.71569 4.40974 4.40973 4.7157 4.21799 5.09202C4 5.51985 4 6.0799 4 7.2V16.8C4 17.9201 4 18.4802 4.21799 18.908C4.40973 19.2843 4.71569 19.5903 5.09202 19.782C5.51984 20 6.0799 20 7.2 20H16.8C17.9201 20 18.4802 20 18.908 19.782C19.2843 19.5903 19.5903 19.2843 19.782 18.908C20 18.4802 20 17.9201 20 16.8V12.5M15.5 5.5L18.3284 8.32843M10.7627 10.2373L17.411 3.58902C18.192 2.80797 19.4584 2.80797 20.2394 3.58902C21.0205 4.37007 21.0205 5.6364 20.2394 6.41745L13.3774 13.2794C12.6158 14.0411 12.235 14.4219 11.8012 14.7247C11.4162 14.9936 11.0009 15.2162 10.564 15.3882C10.0717 15.582 9.54378 15.6885 8.48793 15.9016L8 16L8.04745 15.6678C8.21536 14.4925 8.29932 13.9048 8.49029 13.3561C8.65975 12.8692 8.89125 12.4063 9.17906 11.9786C9.50341 11.4966 9.92319 11.0768 10.7627 10.2373Z" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> </g></svg>
                </button>
                <button 
                  className="trash-button"
                  onClick={async () => {
                    try {
                      await api.post(`${import.meta.env.VITE_LEVELS}/markAnnounced/${level.id}`);
                      onRemove(level.id);
                    } catch (err) {
                      throw err;
                    }
                  }}
                  disabled={isLoading}
                  style ={{width: '40px', height: '40px'}}
                >
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M4 6H20M16 6L15.7294 5.18807C15.4671 4.40125 15.3359 4.00784 15.0927 3.71698C14.8779 3.46013 14.6021 3.26132 14.2905 3.13878C13.9376 3 13.523 3 12.6936 3H11.3064C10.477 3 10.0624 3 9.70951 3.13878C9.39792 3.26132 9.12208 3.46013 8.90729 3.71698C8.66405 4.00784 8.53292 4.40125 8.27064 5.18807L8 6M18 6V16.2C18 17.8802 18 18.7202 17.673 19.362C17.3854 19.9265 16.9265 20.3854 16.362 20.673C15.7202 21 14.8802 21 13.2 21H10.8C9.11984 21 8.27976 21 7.63803 20.673C7.07354 20.3854 6.6146 19.9265 6.32698 19.362C6 18.7202 6 17.8802 6 16.2V6M14 10V17M10 10V17" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> </g></svg>
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="no-items-message">No rerates to announce</div>
        )}
      </div>
    </div>
  );

  export default ReratesTab;