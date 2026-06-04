// tuf-search: #packLevelInsert #pack #levelInsert
import api from '@/utils/api';
import { routes } from '@/api/routes';

export async function validatePackLevelInsert(packId, levelIds, parentId = 0) {
  const response = await api.post(routes.database.levels.packs.validateItems(packId), {
    levelIds,
    parentId: parentId ?? 0,
  });
  return response.data;
}

export async function executePackLevelInsert(packId, levelIds, parentId = 0) {
  const response = await api.post(routes.database.levels.packs.items(packId), {
    type: 'level',
    levelIds,
    parentId: parentId ?? 0,
  });
  return response.data;
}
