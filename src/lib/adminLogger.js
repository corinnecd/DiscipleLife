
import { supabase } from '@/lib/customSupabaseClient';

/**
 * Logs an administrative action to the database.
 * 
 * @param {Object} params - The log parameters
 * @param {string} params.action - The action performed (create, update, delete, approve, reject, publish, unpublish)
 * @param {string} params.entityType - The type of entity (user, testimony, resource, report, challenge, access_code)
 * @param {string} [params.entityId] - The ID of the entity
 * @param {string} [params.entityName] - A readable name for the entity (e.g. User Name, Resource Title)
 * @param {Object} [params.oldValue] - The previous state of the data (as JSON)
 * @param {Object} [params.newValue] - The new state of the data (as JSON)
 */
export const logAdminAction = async ({
  action,
  entityType,
  entityId,
  entityName,
  oldValue,
  newValue
}) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    // Basic role check before attempting insert (RLS will enforce it anyway)
    // We assume the caller is an admin if they are performing admin actions.

    const { error } = await supabase.from('admin_logs').insert({
      admin_id: user.id,
      action,
      entity_type: entityType,
      entity_id: entityId,
      entity_name: entityName,
      old_value: oldValue ? JSON.stringify(oldValue) : null,
      new_value: newValue ? JSON.stringify(newValue) : null,
      user_agent: navigator.userAgent,
      // ip_address is best handled by Supabase Edge Functions or triggers if crucial, 
      // client-side IP detection is unreliable without an external service. 
      // We will leave it null for client-side inserts or use a placeholder.
      ip_address: null 
    });

    if (error) {
      console.error('Failed to log admin action:', error);
    }
  } catch (error) {
    console.error('Error logging admin action:', error);
  }
};
