import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { CustomSelect } from '@/components/common/selectors';
import { CreatorStatusBadge } from '@/components/common/display';
import api from '@/utils/api';
import { toast } from 'react-hot-toast';

/**
 * Creator assign / unassign UI (shared by CreatorAssignmentPopup and AdminPlayerPopup).
 */
export const CreatorAssignmentPanel = ({ user, onUserUpdate, showIntro = true }) => {
  const { t } = useTranslation(['components', 'common']);
  const closeTimeoutRef = useRef(null);

  const [selectedCreator, setSelectedCreator] = useState(null);
  const [creatorSearch, setCreatorSearch] = useState('');
  const [availableCreators, setAvailableCreators] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showUnassignConfirm, setShowUnassignConfirm] = useState(false);
  const [currentCreator, setCurrentCreator] = useState(user?.creator || null);

  useEffect(() => {
    setCurrentCreator(user?.creator || null);
  }, [user?.creator]);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let cancelToken;

    const fetchCreators = async () => {
      try {
        if (cancelToken) {
          cancelToken.cancel('New search initiated');
        }

        cancelToken = api.CancelToken.source();

        setAvailableCreators(null);

        const params = new URLSearchParams({
          page: 1,
          limit: 20,
          search: creatorSearch,
          sort: 'NAME_ASC',
        });

        const response = await api.get(`/v2/database/creators?${params}`, {
          cancelToken: cancelToken.token,
        });

        setAvailableCreators(response.data.results);
      } catch (error) {
        if (!api.isCancel(error)) {
          console.error('Error fetching creators:', error);
          toast.error('Failed to load creators');
          setAvailableCreators([]);
        }
      }
    };

    if (creatorSearch.trim()) {
      fetchCreators();
    } else {
      setAvailableCreators([]);
    }

    return () => {
      if (cancelToken) {
        cancelToken.cancel('Component unmounted');
      }
    };
  }, [creatorSearch]);

  const handleAssignCreator = async () => {
    if (!selectedCreator) return;

    setIsLoading(true);

    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }

    try {
      const response = await api.put(
        `/v2/database/creators/assign-creator-to-user/${user.id}/${selectedCreator.id}`,
      );

      if (response.status === 200) {
        toast.success('Creator assigned successfully');
        setCurrentCreator(response.data.user.creator || null);
        setSelectedCreator(null);
        setCreatorSearch('');
        onUserUpdate?.(response.data.user);
      } else {
        const errorMsg =
          response.data?.error || response.data?.message || 'Failed to assign creator';
        toast.error(errorMsg);
      }
    } catch (error) {
      const errorMsg =
        error.response?.data?.error ||
        error.response?.data?.message ||
        'Failed to assign creator';
      toast.error(errorMsg);
      console.error('Error assigning creator:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnassignCreator = async () => {
    setIsLoading(true);

    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }

    try {
      const response = await api.delete(
        `/v2/database/creators/remove-creator-from-user/${user.id}`,
      );

      if (response.status === 200) {
        toast.success('Creator unassigned successfully');
        setCurrentCreator(null);
        onUserUpdate?.(response.data.user);
      } else {
        const errorMsg =
          response.data?.error || response.data?.message || 'Failed to unassign creator';
        toast.error(errorMsg);
      }
    } catch (error) {
      const errorMsg =
        error.response?.data?.error ||
        error.response?.data?.message ||
        'Failed to unassign creator';
      toast.error(errorMsg);
      console.error('Error unassigning creator:', error);
    } finally {
      setIsLoading(false);
      setShowUnassignConfirm(false);
    }
  };

  const handleUnassignConfirm = (confirmed) => {
    if (confirmed) {
      handleUnassignCreator();
    } else {
      setShowUnassignConfirm(false);
    }
  };

  if (!user?.id) {
    return null;
  }

  return (
    <>
      {showIntro && (
        <div className="popup-header">
          <h2>{t('adminPopups.player.form.creatorAssignment.title', { defaultValue: 'Assign creator' })}</h2>
          <div className="user-info">
            <p>
              <strong>{t('adminPopups.player.form.creatorAssignment.userLabel', { defaultValue: 'User' })}:</strong>{' '}
              {user?.username}
            </p>
            <p>
              <strong>
                {t('adminPopups.player.form.creatorAssignment.currentLabel', {
                  defaultValue: 'Current creator',
                })}
                :
              </strong>{' '}
              {currentCreator?.name || t('adminPopups.player.form.creatorAssignment.none', { defaultValue: 'None' })}
            </p>
          </div>
        </div>
      )}

      <div className={showIntro ? 'popup-content' : 'popup-content popup-content--no-intro'}>
        {currentCreator ? (
          <div className="current-creator-section">
            <div className="current-creator-info">
              <h3>{t('adminPopups.player.form.creatorAssignment.currentHeading', { defaultValue: 'Current creator' })}</h3>
              <div className="creator-card">
                <div className="creator-card-info">
                  <div className="creator-name">{currentCreator.name}</div>
                  <div className="creator-id">(ID: {currentCreator.id})</div>
                </div>

                {currentCreator.verificationStatus && (
                  <CreatorStatusBadge
                    status={currentCreator.verificationStatus}
                    size="small"
                    className="creator-card-status"
                  />
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowUnassignConfirm(true)}
                className="unassign-button"
                disabled={isLoading}
              >
                {t('adminPopups.player.form.creatorAssignment.unassign', {
                  defaultValue: 'Unassign creator',
                })}
              </button>
            </div>
          </div>
        ) : (
          <div className="assign-creator-section">
            <div className="form-group">
              <label htmlFor="creator-assignment-select">
                {t('adminPopups.player.form.creatorAssignment.searchLabel', {
                  defaultValue: 'Search and select creator',
                })}
              </label>
              <CustomSelect
                inputId="creator-assignment-select"
                options={
                  availableCreators === null
                    ? []
                    : availableCreators.map((c) => ({
                        value: c.id,
                        label: `${c.name} (ID: ${c.id}, Charts: ${c.credits?.length || 0})${
                          c.creatorAliases?.length > 0
                            ? ` [${c.creatorAliases.map((a) => a.name).join(', ')}]`
                            : ''
                        }`,
                      }))
                }
                value={
                  selectedCreator
                    ? {
                        value: selectedCreator.id,
                        label: `${selectedCreator.name} (ID: ${selectedCreator.id})`,
                      }
                    : null
                }
                onChange={(option) => {
                  const creator = availableCreators?.find((c) => c.id === option?.value);
                  setSelectedCreator(creator);
                }}
                placeholder={t('adminPopups.player.form.creatorAssignment.searchPlaceholder', {
                  defaultValue: 'Type to search creators…',
                })}
                onInputChange={(value) => setCreatorSearch(value)}
                isSearchable
                width="100%"
                isLoading={availableCreators === null}
                noOptionsMessage={() =>
                  availableCreators === null
                    ? 'Loading...'
                    : t('adminPopups.player.form.creatorAssignment.typeToSearch', {
                        defaultValue: 'Type to search creators...',
                      })
                }
              />
            </div>

            <button
              type="button"
              className={`action-button ${isLoading ? 'loading' : ''}`}
              onClick={handleAssignCreator}
              disabled={isLoading || !selectedCreator}
            >
              {isLoading ? (
                <svg className="spinner spinner-svg" viewBox="0 0 50 50">
                  <circle cx="25" cy="25" r="20" fill="none" strokeWidth="5"></circle>
                </svg>
              ) : (
                t('adminPopups.player.form.creatorAssignment.assign', { defaultValue: 'Assign creator' })
              )}
            </button>
          </div>
        )}

        {showUnassignConfirm && (
          <div className="confirm-dialog">
            <div className="confirm-content">
              <p>
                {t('adminPopups.player.form.creatorAssignment.unassignConfirm', {
                  defaultValue: 'Unassign this creator from this user?',
                })}
              </p>
              <div className="confirm-buttons">
                <button
                  type="button"
                  onClick={() => handleUnassignConfirm(true)}
                  className="confirm-yes"
                  disabled={isLoading}
                >
                  {t('adminPopups.player.form.creatorAssignment.unassignYes', {
                    defaultValue: 'Yes, unassign',
                  })}
                </button>
                <button
                  type="button"
                  onClick={() => handleUnassignConfirm(false)}
                  className="confirm-no"
                  disabled={isLoading}
                >
                  {t('buttons.cancel', { ns: 'common' })}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
