/**
 * Hook useMembersTable – Filtres, pagination et sélection pour un tableau de membres
 * Réutilisable sur tous les dashboards (Superviseur, Pasteur, Mentor, Disciple).
 */
import { useState, useMemo, useEffect } from 'react';

function checkNombreDisciples(term, nombreDisciples) {
  const t = (term || '').trim();
  if (t.startsWith('>=') || t.startsWith('≥')) {
    const n = parseInt(t.substring(2).trim(), 10);
    return !isNaN(n) && nombreDisciples >= n;
  }
  if (t.startsWith('<=') || t.startsWith('≤')) {
    const n = parseInt(t.substring(2).trim(), 10);
    return !isNaN(n) && nombreDisciples <= n;
  }
  if (t.startsWith('>')) {
    const n = parseInt(t.substring(1).trim(), 10);
    return !isNaN(n) && nombreDisciples > n;
  }
  if (t.startsWith('<')) {
    const n = parseInt(t.substring(1).trim(), 10);
    return !isNaN(n) && nombreDisciples < n;
  }
  const num = parseInt(t, 10);
  if (!isNaN(num)) return nombreDisciples === num;
  return false;
}

/**
 * @param {Array} members - Liste des membres (id, first_name, last_name, email, statut_spirituel, created_at, avatar_url, ...)
 * @param {Object} options - { membresProgression: {}, membresDisciplesCount: {}, membresSuiviPar: {} }
 */
export function useMembersTable(members = [], options = {}) {
  const {
    membresProgression = {},
    membresDisciplesCount = {},
    membresSuiviPar = {},
  } = options;

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('tous');
  const [dateFilter, setDateFilter] = useState('');
  const [progressionFilter, setProgressionFilter] = useState('tous');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedMembres, setSelectedMembres] = useState([]);

  const filteredMembres = useMemo(() => {
    return (members || [])
      .map((m) => ({
        ...m,
        nombreDisciples: membresDisciplesCount[m.id] ?? m.nombreDisciples ?? 0,
      }))
      .filter((m) => {
        const matchSearch =
          !searchTerm ||
          (m.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            checkNombreDisciples(searchTerm, m.nombreDisciples) ||
            m.email?.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchStatus =
          statusFilter === 'tous' ||
          (statusFilter === 'actif' && m.statut_spirituel !== 'inactif') ||
          (statusFilter === 'inactif' && m.statut_spirituel === 'inactif');
        const matchDate =
          !dateFilter ||
          (m.created_at &&
            new Date(m.created_at).toISOString().split('T')[0] === dateFilter);
        const prog = membresProgression[m.id];
        const matchProg =
          progressionFilter === 'tous' ||
          (progressionFilter === 'avec' &&
            prog &&
            (prog.formations > 0 || prog.videos > 0)) ||
          (progressionFilter === 'sans' &&
            (!prog || (prog.formations === 0 && prog.videos === 0)));
        return matchSearch && matchStatus && matchDate && matchProg;
      })
      .sort(
        (a, b) =>
          (b.nombreDisciples || 0) - (a.nombreDisciples || 0) ||
          `${a.first_name || ''} ${a.last_name || ''}`
            .trim()
            .toLowerCase()
            .localeCompare(
              `${b.first_name || ''} ${b.last_name || ''}`.trim().toLowerCase()
            )
      );
  }, [
    members,
    searchTerm,
    statusFilter,
    dateFilter,
    progressionFilter,
    membresProgression,
    membresDisciplesCount,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredMembres.length / itemsPerPage)
  );
  const paginatedMembres = useMemo(
    () =>
      filteredMembres.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
      ),
    [filteredMembres, currentPage, itemsPerPage]
  );

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) setCurrentPage(1);
  }, [totalPages, currentPage]);

  const toggleSelectMembre = (membreId) => {
    setSelectedMembres((prev) =>
      prev.includes(membreId)
        ? prev.filter((id) => id !== membreId)
        : [...prev, membreId]
    );
  };

  const toggleSelectAll = () => {
    setSelectedMembres(
      selectedMembres.length === paginatedMembres.length
        ? []
        : paginatedMembres.map((m) => m.id)
    );
  };

  return {
    filteredMembres,
    paginatedMembres,
    totalPages,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    dateFilter,
    setDateFilter,
    progressionFilter,
    setProgressionFilter,
    itemsPerPage,
    setItemsPerPage,
    currentPage,
    setCurrentPage,
    selectedMembres,
    setSelectedMembres,
    toggleSelectAll,
    toggleSelectMembre,
    membresProgression,
    membresSuiviPar,
  };
}
