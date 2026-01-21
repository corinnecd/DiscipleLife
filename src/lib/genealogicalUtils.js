/**
 * Utilitaires pour l'Arbre Généalogique
 * 
 * Fonctions pour :
 * - Recherche de personnes dans profils et cercle_personnes
 * - Construction de la hiérarchie ascendante (remontée)
 * - Construction de la hiérarchie descendante (descente)
 * - Récursion multi-niveaux
 */

import { supabase } from './customSupabaseClient';

/**
 * Recherche universelle de personnes
 * @param {string} searchTerm - Terme de recherche (nom ou prénom)
 * @returns {Promise<Array>} Liste de personnes trouvées
 */
export const searchPersons = async (searchTerm) => {
  if (!searchTerm || searchTerm.trim().length < 2) {
    return [];
  }

  try {
    const search = searchTerm.trim().toLowerCase();
    
    // Rechercher dans profils (pasteurs, superviseurs, mentors, disciples avec compte)
    const { data: profilsData, error: profilsError } = await supabase
      .from('profils')
      .select('id, first_name, last_name, email, role, avatar_url, famille_id, pasteur_id')
      .or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`)
      .limit(20);

    if (profilsError && profilsError.code !== 'PGRST116') {
      console.error('Erreur recherche profils:', profilsError);
    }

    // Rechercher dans cercle_personnes (disciples sans compte)
    const { data: cercleData, error: cercleError } = await supabase
      .from('cercle_personnes')
      .select('id, first_name, last_name, name, email, circle_type, avatar_url, user_id, parent_disciple_id')
      .or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,name.ilike.%${search}%`)
      .limit(20);

    if (cercleError && cercleError.code !== 'PGRST116') {
      console.error('Erreur recherche cercle_personnes:', cercleError);
    }

    // Combiner et formater les résultats
    const results = [];

    // Ajouter les profils
    if (profilsData) {
      profilsData.forEach(p => {
        results.push({
          id: p.id,
          type: 'profil',
          first_name: p.first_name || '',
          last_name: p.last_name || '',
          name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email || 'Sans nom',
          email: p.email,
          role: p.role,
          avatar_url: p.avatar_url,
          famille_id: p.famille_id,
          pasteur_id: p.pasteur_id,
          displayLabel: `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email || 'Sans nom',
          roleLabel: getRoleLabel(p.role)
        });
      });
    }

    // Ajouter les personnes du cercle
    if (cercleData) {
      cercleData.forEach(c => {
        results.push({
          id: c.id,
          type: 'cercle',
          first_name: c.first_name || '',
          last_name: c.last_name || '',
          name: c.name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Sans nom',
          email: c.email,
          role: c.circle_type || 'disciple',
          avatar_url: c.avatar_url,
          user_id: c.user_id, // Mentor qui suit cette personne
          parent_disciple_id: c.parent_disciple_id,
          displayLabel: c.name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Sans nom',
          roleLabel: getRoleLabel(c.circle_type || 'disciple')
        });
      });
    }

    // Trier par pertinence (exact match en premier)
    return results.sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      const searchLower = search.toLowerCase();
      
      if (aName.startsWith(searchLower) && !bName.startsWith(searchLower)) return -1;
      if (!aName.startsWith(searchLower) && bName.startsWith(searchLower)) return 1;
      return aName.localeCompare(bName);
    });

  } catch (error) {
    console.error('Erreur recherche universelle:', error);
    return [];
  }
};

/**
 * Récupère les ascendants d'une personne (remontée vers le pasteur)
 * @param {string} personId - ID de la personne
 * @param {string} personType - Type: 'profil' ou 'cercle'
 * @returns {Promise<Object>} Arbre des ascendants
 */
export const fetchAscendants = async (personId, personType = 'profil') => {
  // Valeur par défaut en cas d'erreur
  const defaultReturn = { person: null, ancestors: [] };
  
  if (!personId) {
    console.warn('fetchAscendants: personId manquant');
    return defaultReturn;
  }

  try {
    const ascendants = [];
    let currentId = personId;
    let currentType = personType;
    let level = 0;
    const maxLevels = 10; // Limite de sécurité

    while (currentId && level < maxLevels) {
      let personData = null;

      if (currentType === 'profil') {
        // Récupérer depuis profils
        const { data, error } = await supabase
          .from('profils')
          .select('id, first_name, last_name, email, role, avatar_url, famille_id, pasteur_id')
          .eq('id', currentId)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Erreur récupération profil:', error);
          break;
        }

        if (data) {
          personData = {
            id: data.id,
            type: 'profil',
            name: `${data.first_name || ''} ${data.last_name || ''}`.trim() || data.email || 'Sans nom',
            first_name: data.first_name || '',
            last_name: data.last_name || '',
            email: data.email,
            role: data.role,
            avatar_url: data.avatar_url,
            famille_id: data.famille_id,
            pasteur_id: data.pasteur_id,
            level: level
          };

          // Déterminer le parent selon le rôle
          if (data.role === 'disciple') {
            // Disciple → trouver son mentor (via famille_id ou cercle_personnes)
            const { data: familleData } = await supabase
              .from('familles_disciples')
              .select('superviseur_id')
              .eq('id', data.famille_id)
              .maybeSingle();

            if (familleData?.superviseur_id) {
              // Trouver le superviseur
              const { data: superviseurData } = await supabase
                .from('profils')
                .select('id, first_name, last_name, role, pasteur_id')
                .eq('id', familleData.superviseur_id)
                .maybeSingle();

              if (superviseurData) {
                currentId = superviseurData.id;
                currentType = 'profil';
                ascendants.push(personData);
                level++;
                continue;
              }
            }

            // Si pas de famille, chercher dans cercle_personnes
            const { data: cercleData } = await supabase
              .from('cercle_personnes')
              .select('user_id, parent_disciple_id')
              .eq('id', currentId)
              .maybeSingle();

            if (cercleData?.user_id) {
              // user_id est le mentor
              const { data: mentorData } = await supabase
                .from('profils')
                .select('id, first_name, last_name, role, famille_id')
                .eq('id', cercleData.user_id)
                .maybeSingle();

              if (mentorData) {
                currentId = mentorData.id;
                currentType = 'profil';
                ascendants.push(personData);
                level++;
                continue;
              }
            }

            // Pas de parent trouvé, arrêter
            ascendants.push(personData);
            break;

          } else if (data.role === 'mentor') {
            // Mentor → trouver son superviseur (via famille)
            if (data.famille_id) {
              const { data: familleData } = await supabase
                .from('familles_disciples')
                .select('superviseur_id')
                .eq('id', data.famille_id)
                .maybeSingle();

              if (familleData?.superviseur_id) {
                currentId = familleData.superviseur_id;
                currentType = 'profil';
                ascendants.push(personData);
                level++;
                continue;
              }
            }
            ascendants.push(personData);
            break;

          } else if (data.role === 'superviseur') {
            // Superviseur → trouver son pasteur
            if (data.pasteur_id) {
              currentId = data.pasteur_id;
              currentType = 'profil';
              ascendants.push(personData);
              level++;
              continue;
            }
            ascendants.push(personData);
            break;

          } else if (data.role === 'pasteur') {
            // Pasteur = racine, arrêter
            ascendants.push(personData);
            break;
          }
        }

      } else if (currentType === 'cercle') {
        // Récupérer depuis cercle_personnes
        const { data, error } = await supabase
          .from('cercle_personnes')
          .select('id, first_name, last_name, name, email, circle_type, avatar_url, user_id, parent_disciple_id')
          .eq('id', currentId)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Erreur récupération cercle:', error);
          break;
        }

        if (data) {
          personData = {
            id: data.id,
            type: 'cercle',
            name: data.name || `${data.first_name || ''} ${data.last_name || ''}`.trim() || 'Sans nom',
            first_name: data.first_name || '',
            last_name: data.last_name || '',
            email: data.email,
            role: data.circle_type || 'disciple',
            avatar_url: data.avatar_url,
            user_id: data.user_id,
            parent_disciple_id: data.parent_disciple_id,
            level: level
          };

          // Trouver le parent (mentor via user_id ou parent_disciple_id)
          if (data.user_id) {
            // user_id est le mentor
            const { data: mentorData } = await supabase
              .from('profils')
              .select('id, first_name, last_name, role, famille_id')
              .eq('id', data.user_id)
              .maybeSingle();

            if (mentorData) {
              currentId = mentorData.id;
              currentType = 'profil';
              ascendants.push(personData);
              level++;
              continue;
            }
          }

          if (data.parent_disciple_id) {
            // parent_disciple_id pointe vers un autre disciple
            currentId = data.parent_disciple_id;
            currentType = 'cercle';
            ascendants.push(personData);
            level++;
            continue;
          }

          // Pas de parent trouvé
          ascendants.push(personData);
          break;
        }
      }

      // Si on arrive ici, pas de données trouvées
      break;
    }

    return {
      person: ascendants[0] || null,
      ancestors: ascendants.slice(1).reverse() // Inverser pour avoir du plus proche au plus lointain
    };

  } catch (error) {
    console.error('Erreur récupération ascendants:', error);
    return { person: null, ancestors: [] };
  }
};

/**
 * Récupère les descendants d'une personne (descente récursive)
 * @param {string} personId - ID de la personne
 * @param {string} personType - Type: 'profil' ou 'cercle'
 * @param {number} maxDepth - Profondeur maximale (défaut: 5)
 * @returns {Promise<Object>} Arbre des descendants
 */
export const fetchDescendants = async (personId, personType = 'profil', maxDepth = 5) => {
  // Valeur par défaut en cas d'erreur
  if (!personId) {
    console.warn('fetchDescendants: personId manquant');
    return null;
  }

  try {
    const buildDescendantsTree = async (id, type, depth = 0) => {
      if (depth >= maxDepth) {
        return null;
      }

      let personData = null;
      let children = [];

      if (type === 'profil') {
        // Récupérer le profil
        const { data, error } = await supabase
          .from('profils')
          .select('id, first_name, last_name, email, role, avatar_url, famille_id')
          .eq('id', id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Erreur récupération profil:', error);
          return null;
        }

        if (data) {
          personData = {
            id: data.id,
            type: 'profil',
            name: `${data.first_name || ''} ${data.last_name || ''}`.trim() || data.email || 'Sans nom',
            first_name: data.first_name || '',
            last_name: data.last_name || '',
            email: data.email,
            role: data.role,
            avatar_url: data.avatar_url,
            famille_id: data.famille_id,
            level: depth
          };

          // Trouver les disciples selon le rôle
          if (data.role === 'mentor' || data.role === 'superviseur' || data.role === 'pasteur') {
            // Récupérer les disciples depuis cercle_personnes où user_id = id
            const { data: disciplesData } = await supabase
              .from('cercle_personnes')
              .select('id, first_name, last_name, name, email, circle_type, avatar_url, user_id, parent_disciple_id')
              .eq('user_id', id)
              .order('name');

            if (disciplesData) {
              // Récupérer récursivement les descendants de chaque disciple
              const childrenPromises = disciplesData.map(disciple => 
                buildDescendantsTree(disciple.id, 'cercle', depth + 1)
              );
              children = (await Promise.all(childrenPromises)).filter(Boolean);
            }
          }

          // Si c'est un disciple dans profils, chercher dans cercle_personnes
          if (data.role === 'disciple' && data.famille_id) {
            // Chercher les disciples de ce disciple dans cercle_personnes
            const { data: subDisciples } = await supabase
              .from('cercle_personnes')
              .select('id, first_name, last_name, name, email, circle_type, avatar_url, user_id, parent_disciple_id')
              .eq('parent_disciple_id', id)
              .order('name');

            if (subDisciples) {
              const childrenPromises = subDisciples.map(disciple => 
                buildDescendantsTree(disciple.id, 'cercle', depth + 1)
              );
              children = (await Promise.all(childrenPromises)).filter(Boolean);
            }
          }
        }

      } else if (type === 'cercle') {
        // Récupérer depuis cercle_personnes
        const { data, error } = await supabase
          .from('cercle_personnes')
          .select('id, first_name, last_name, name, email, circle_type, avatar_url, user_id, parent_disciple_id')
          .eq('id', id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Erreur récupération cercle:', error);
          return null;
        }

        if (data) {
          personData = {
            id: data.id,
            type: 'cercle',
            name: data.name || `${data.first_name || ''} ${data.last_name || ''}`.trim() || 'Sans nom',
            first_name: data.first_name || '',
            last_name: data.last_name || '',
            email: data.email,
            role: data.circle_type || 'disciple',
            avatar_url: data.avatar_url,
            user_id: data.user_id,
            parent_disciple_id: data.parent_disciple_id,
            level: depth
          };

          // Trouver les disciples de ce disciple (via parent_disciple_id)
          const { data: subDisciples } = await supabase
            .from('cercle_personnes')
            .select('id, first_name, last_name, name, email, circle_type, avatar_url, user_id, parent_disciple_id')
            .eq('parent_disciple_id', id)
            .order('name');

          if (subDisciples) {
            const childrenPromises = subDisciples.map(disciple => 
              buildDescendantsTree(disciple.id, 'cercle', depth + 1)
            );
            children = (await Promise.all(childrenPromises)).filter(Boolean);
          }
        }
      }

      if (!personData) {
        return null;
      }

      return {
        ...personData,
        children: children
      };
    };

    return await buildDescendantsTree(personId, personType, 0);

  } catch (error) {
    console.error('Erreur récupération descendants:', error);
    return null;
  }
};

/**
 * Récupère l'arbre complet (ascendants + descendants)
 * @param {string} personId - ID de la personne
 * @param {string} personType - Type: 'profil' ou 'cercle'
 * @returns {Promise<Object>} Arbre complet
 */
export const fetchCompleteTree = async (personId, personType = 'profil') => {
  try {
    const [ascendantsResult, descendantsTree] = await Promise.all([
      fetchAscendants(personId, personType),
      fetchDescendants(personId, personType)
    ]);

    return {
      person: ascendantsResult.person || descendantsTree,
      ancestors: ascendantsResult.ancestors || [],
      descendants: descendantsTree?.children || []
    };

  } catch (error) {
    console.error('Erreur récupération arbre complet:', error);
    return {
      person: null,
      ancestors: [],
      descendants: []
    };
  }
};

/**
 * Convertit un rôle en label français
 */
const getRoleLabel = (role) => {
  const labels = {
    'pasteur': 'Pasteur',
    'superviseur': 'Superviseur',
    'mentor': 'Mentor (Pilier)',
    'disciple': 'Disciple',
    'admin': 'Administrateur',
    'super_admin': 'Super Administrateur',
    'unbeliever': 'Non-croyant',
    'newbeliever': 'Nouveau converti',
    'established': 'Disciple Affermi',
    'maker': 'Faiseur de Disciples'
  };
  return labels[role] || role;
};
