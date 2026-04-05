import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CustomSelect } from '@/components/common/selectors';
import FacetItemPicker from './FacetItemPicker';
import './facetquerybuilder.css';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

// todo: add warning when switching off advanced mode with double click confirm 

function emptyAdvanced() {
  return {
    mode: 'advanced',
    groups: [{ quantifier: 'all', ids: [] }],
    betweenPairs: [],
    betweenGroups: 'and',
    excludeIds: [],
  };
}

function padBetweenPairs(adv) {
  if (adv.mode !== 'advanced') return adv;
  const n = adv.groups.length;
  const need = Math.max(0, n - 1);
  const fb = adv.betweenGroups || 'and';
  const p = [...(adv.betweenPairs || [])];
  while (p.length < need) p.push(fb);
  if (p.length > need) p.length = need;
  return { ...adv, betweenPairs: p };
}

function removeGroupAt(groups, betweenPairs, i) {
  const g = [...groups];
  const p = [...(betweenPairs || [])];
  const n = g.length;
  if (n <= 1) return { groups: g, betweenPairs: p };
  g.splice(i, 1);
  if (i === 0) {
    p.splice(0, 1);
  } else if (i === n - 1) {
    p.pop();
  } else {
    const left = p[i - 1];
    const right = p[i];
    const merged = left === 'or' || right === 'or' ? 'or' : 'and';
    p.splice(i - 1, 2, merged);
  }
  return { groups: g, betweenPairs: p };
}

/**
 * @param {object} props
 * @param {{ id: number, name: string, color?: string, icon?: string }[]} props.items
 * @param {object | null} props.value - FacetDomain or null
 * @param {(v: object | null) => void} props.onChange
 * @param {string} props.title
 * @param {boolean} [props.enableGrouping]
 */
const FacetQueryBuilder = ({ items, value, onChange, title, enableGrouping = true }) => {
  const { t } = useTranslation('components');
  const [isOpen, setIsOpen] = useState(false);
  const [addSearch, setAddSearch] = useState('');
  const [picker, setPicker] = useState(null);
  const dropdownRef = useRef(null);
  useBodyScrollLock(isOpen);

  const uiMode = value?.mode === 'advanced' ? 'advanced' : 'simple';

  const itemById = useMemo(() => {
    const m = new Map();
    (items || []).forEach((it) => m.set(it.id, it));
    return m;
  }, [items]);

  const filteredItems = items || [];

  useEffect(() => {
    if (uiMode !== 'advanced') setPicker(null);
  }, [uiMode]);

  useEffect(() => {
    const handleOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutside);
      document.addEventListener('touchstart', handleOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [isOpen]);

  const ensureSimple = () => {
    if (!value || value.mode !== 'simple') return { mode: 'simple', op: 'or', ids: [] };
    return { ...value, ids: [...(value.ids || [])] };
  };

  const toggleSimpleId = (id) => {
    const s = ensureSimple();
    const next = s.ids.includes(id) ? s.ids.filter((x) => x !== id) : [...s.ids, id];
    onChange(next.length ? { mode: 'simple', op: 'or', ids: next } : null);
  };

  const switchToAdvanced = () => {
    if (value?.mode === 'advanced') return;
    const ids = value?.mode === 'simple' ? value.ids || [] : [];
    onChange(
      padBetweenPairs({
        mode: 'advanced',
        groups: [{ quantifier: 'any', ids: [...ids] }],
        betweenPairs: [],
        betweenGroups: 'and',
        excludeIds: [],
      })
    );
  };

  const switchToSimple = () => {
    if (!value || value.mode === 'simple') return;
    const all = new Set();
    (value.groups || []).forEach((g) => (g.ids || []).forEach((id) => all.add(id)));
    const ids = [...all];
    onChange(ids.length ? { mode: 'simple', op: 'or', ids } : null);
  };

  const updateAdvanced = (patch) => {
    const base = value?.mode === 'advanced' ? { ...value, ...patch } : { ...emptyAdvanced(), ...patch };
    onChange(padBetweenPairs(base));
  };

  const setGroupIds = (index, ids) => {
    const g = [...(value.groups || emptyAdvanced().groups)];
    g[index] = { ...g[index], ids };
    updateAdvanced({ groups: g });
  };

  const setQuantifier = (index, quantifier) => {
    const g = [...(value.groups || [])];
    if (!g[index]) return;
    g[index] = { ...g[index], quantifier };
    updateAdvanced({ groups: g });
  };

  const setBetweenOp = (pairIndex, op) => {
    const p = [...(value.betweenPairs || [])];
    p[pairIndex] = op;
    updateAdvanced({ betweenPairs: p });
  };

  const addGroup = () => {
    if (value?.mode !== 'advanced') return;
    const g = [...value.groups];
    const p = [...(value.betweenPairs || [])];
    const fb = value.betweenGroups || 'and';
    if (g.length > 0) p.push(fb);
    g.push({ quantifier: 'any', ids: [] });
    updateAdvanced({ groups: g, betweenPairs: p });
  };

  const removeGroup = (index) => {
    if (value?.mode !== 'advanced') return;
    if (value.groups.length <= 1) return;
    const { groups, betweenPairs } = removeGroupAt(value.groups, value.betweenPairs, index);
    updateAdvanced({ groups, betweenPairs });
  };

  const addToGroup = (index, id) => {
    const g = value?.mode === 'advanced' ? value.groups[index] : null;
    const cur = g?.ids || [];
    if (cur.includes(id)) return;
    setGroupIds(index, [...cur, id]);
  };

  const removeFromGroup = (index, id) => {
    const g = value?.mode === 'advanced' ? value.groups[index] : null;
    const cur = g?.ids || [];
    setGroupIds(index, cur.filter((x) => x !== id));
  };

  const addExclude = (id) => {
    if (value?.mode !== 'advanced') return;
    const ex = [...(value.excludeIds || [])];
    if (ex.includes(id)) return;
    updateAdvanced({ excludeIds: [...ex, id] });
  };

  const removeExclude = (id) => {
    if (value?.mode !== 'advanced') return;
    updateAdvanced({
      excludeIds: (value.excludeIds || []).filter((x) => x !== id),
    });
  };

  const countSelected = () => {
    if (!value) return 0;
    if (value.mode === 'simple') return (value.ids || []).length;
    let n = 0;
    (value.groups || []).forEach((g) => {
      n += (g.ids || []).length;
    });
    n += (value.excludeIds || []).length;
    return n;
  };

  const orderedGroups = useMemo(() => {
    const q = addSearch.toLowerCase();
    const list = q
      ? filteredItems.filter((it) => String(it.name).toLowerCase().includes(q))
      : filteredItems;
    if (!enableGrouping) return [['', { items: list, groupSortOrder: 0 }]];
    const itemGroups = list.reduce((acc, item) => {
      const group =
        item.group && String(item.group).trim() !== ''
          ? item.group
          : t('facetQueryBuilder.fallbackGroup');
      if (!acc[group]) acc[group] = { items: [], groupSortOrder: item.groupSortOrder ?? 999999 };
      acc[group].items.push(item);
      if (item.groupSortOrder != null && item.groupSortOrder < acc[group].groupSortOrder) {
        acc[group].groupSortOrder = item.groupSortOrder;
      }
      return acc;
    }, {});
    return Object.entries(itemGroups).sort((a, b) => a[1].groupSortOrder - b[1].groupSortOrder);
  }, [filteredItems, enableGrouping, t, addSearch]);

  const advancedVal = value?.mode === 'advanced' ? padBetweenPairs(value) : null;
  const pairs = advancedVal?.betweenPairs || [];

  const betweenGroupOptions = useMemo(
    () => [
      { value: 'and', label: t('facetQueryBuilder.and') },
      { value: 'or', label: t('facetQueryBuilder.or') },
    ],
    [t]
  );

  const quantifierOptions = useMemo(
    () => [
      { value: 'all', label: t('facetQueryBuilder.all') },
      { value: 'any', label: t('facetQueryBuilder.any') },
    ],
    [t]
  );

  if (!items) return null;

  return (
    <div className={`facet-query-builder ${isOpen ? 'facet-query-builder--open' : ''}`}>
      <button
        type="button"
        className="facet-query-builder__toggle"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{title}</span>
        <span className="facet-query-builder__count">
          {countSelected() > 0 ? `(${countSelected()})` : ''}
        </span>
        <svg className="facet-query-builder__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="facet-query-builder__backdrop" onClick={() => setIsOpen(false)} aria-hidden />
          <div className="facet-query-builder__panel" ref={dropdownRef}>
            <div className="facet-query-builder__toolbar">
              <button
                type="button"
                className={`facet-query-builder__mode ${uiMode === 'simple' ? 'is-active' : ''}`}
                onClick={() => switchToSimple()}
              >
                {t('facetQueryBuilder.simple')}
              </button>
              <button
                type="button"
                className={`facet-query-builder__mode ${uiMode === 'advanced' ? 'is-active' : ''}`}
                onClick={() => switchToAdvanced()}
              >
                {t('facetQueryBuilder.advanced')}
              </button>
            </div>

            {uiMode === 'simple' && (
              <div className="facet-query-builder__simple">
                <input
                  type="search"
                  className="facet-query-builder__search"
                  placeholder={t('facetQueryBuilder.searchPlaceholder')}
                  value={addSearch}
                  onChange={(e) => setAddSearch(e.target.value)}
                />
                <div className="facet-query-builder__chips">
                  {(value?.mode === 'simple' ? value.ids || [] : []).map((id) => {
                    const it = itemById.get(id);
                    if (!it) return null;
                    return (
                      <button
                        key={id}
                        type="button"
                        className="facet-query-builder__chip"
                        style={{ backgroundColor: `${it.color || '#444'}55` }}
                        onClick={() => toggleSimpleId(id)}
                      >
                        {it.icon && <img src={it.icon} alt="" className="facet-query-builder__chip-icon" />}
                        {it.name}
                      </button>
                    );
                  })}
                </div>
                <div className="facet-query-builder__grid">
                  {orderedGroups.map(([group, data]) => (
                    <div key={group} className="facet-query-builder__group">
                      {enableGrouping && <h4 className="facet-query-builder__group-title">{group}</h4>}
                      <div className="facet-query-builder__list">
                        {data.items.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            className={`facet-query-builder__item ${
                              value?.mode === 'simple' && (value.ids || []).includes(item.id)
                                ? 'is-selected'
                                : ''
                            }`}
                            style={{ backgroundColor: `${item.color}55` }}
                            onClick={() => toggleSimpleId(item.id)}
                          >
                            {item.icon && (
                              <img src={item.icon} alt="" className="facet-query-builder__item-icon" />
                            )}
                            <span>{item.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {uiMode === 'advanced' && advancedVal && (
              <div className="facet-query-builder__advanced">
                {advancedVal.groups.map((grp, gi) => (
                  <div key={gi}>
                    {gi > 0 && (
                      <div className="facet-query-builder__between facet-query-builder__between--inline">
                        <label className="facet-query-builder__between-label">
                          {t('facetQueryBuilder.betweenGroups')}
                        </label>
                        <div className="facet-query-builder__select facet-query-builder__select--between">
                          <CustomSelect
                            width="6rem"
                            value={betweenGroupOptions.find(
                              (o) => o.value === (pairs[gi - 1] || advancedVal.betweenGroups)
                            )}
                            onChange={(opt) =>
                              setBetweenOp(gi - 1, opt?.value === 'or' ? 'or' : 'and')
                            }
                            options={betweenGroupOptions}
                            isSearchable={false}
                            isClearable={false}
                          />
                        </div>
                      </div>
                    )}
                    <div className="facet-query-builder__cond-row">
                      <div className="facet-query-builder__cond-head">
                        <div className="facet-query-builder__select facet-query-builder__select--quant">
                          <CustomSelect
                            width="6rem"
                            value={quantifierOptions.find((o) => o.value === grp.quantifier)}
                            onChange={(opt) =>
                              setQuantifier(gi, opt?.value === 'any' ? 'any' : 'all')
                            }
                            options={quantifierOptions}
                            isSearchable={false}
                            isClearable={false}
                            aria-label={t('facetQueryBuilder.conditionType')}
                          />
                        </div>
                        {advancedVal.groups.length > 1 && (
                          <button
                            type="button"
                            className="facet-query-builder__remove-cond"
                            onClick={() => removeGroup(gi)}
                            title={t('facetQueryBuilder.removeCondition')}
                          >
                            ×
                          </button>
                        )}
                      </div>
                      <div className="facet-query-builder__chips facet-query-builder__chips--wrap">
                        {(grp.ids || []).map((id) => {
                          const it = itemById.get(id);
                          if (!it) return null;
                          return (
                            <button
                              key={id}
                              type="button"
                              className="facet-query-builder__chip"
                              style={{ backgroundColor: `${it.color || '#444'}55` }}
                              onClick={() => removeFromGroup(gi, id)}
                            >
                              {it.icon && (
                                <img src={it.icon} alt="" className="facet-query-builder__chip-icon" />
                              )}
                              {it.name}
                            </button>
                          );
                        })}
                        <button
                          type="button"
                          className="facet-query-builder__add-item"
                          onClick={() => setPicker({ kind: 'group', index: gi })}
                        >
                          {t('facetQueryBuilder.addItem')}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                <button type="button" className="facet-query-builder__add-condition" onClick={addGroup}>
                  {t('facetQueryBuilder.addCondition')}
                </button>

                <div className="facet-query-builder__cond-row facet-query-builder__row--exclude">
                  <span className="facet-query-builder__row-label">{t('facetQueryBuilder.exclude')}</span>
                  <div className="facet-query-builder__chips facet-query-builder__chips--wrap">
                    {(advancedVal.excludeIds || []).map((id) => {
                      const it = itemById.get(id);
                      if (!it) return null;
                      return (
                        <button
                          key={id}
                          type="button"
                          className="facet-query-builder__chip facet-query-builder__chip--exclude"
                          style={{ backgroundColor: `${it.color || '#444'}55` }}
                          onClick={() => removeExclude(id)}
                        >
                          {it.icon && (
                            <img src={it.icon} alt="" className="facet-query-builder__chip-icon" />
                          )}
                          {it.name}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      className="facet-query-builder__add-item"
                      onClick={() => setPicker({ kind: 'exclude' })}
                    >
                      {t('facetQueryBuilder.addItem')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      <FacetItemPicker
        isOpen={Boolean(picker)}
        onClose={() => setPicker(null)}
        items={filteredItems}
        excludeIds={
          picker?.kind === 'group'
            ? new Set(advancedVal?.groups[picker.index]?.ids || [])
            : new Set(advancedVal?.excludeIds || [])
        }
        enableGrouping={enableGrouping}
        title={
          picker?.kind === 'exclude'
            ? t('facetQueryBuilder.pickExcludeTitle')
            : t('facetQueryBuilder.pickItemTitle')
        }
        onPick={(id) => {
          if (picker?.kind === 'group') addToGroup(picker.index, id);
          else if (picker?.kind === 'exclude') addExclude(id);
        }}
      />
    </div>
  );
};

export default FacetQueryBuilder;
