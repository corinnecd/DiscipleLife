# 🎨 Guide de Migration vers le Thème Clair

Ce guide documente les changements de couleurs pour migrer du thème sombre au thème clair et moderne.

## 📋 Changements de Base

### Couleurs de fond
- **Ancien** : `bg-[#0f0518]`, `bg-[#1a0b2e]`, `bg-purple-950`
- **Nouveau** : `bg-gray-50`, `bg-white`, `bg-gray-100`

### Couleurs de texte
- **Ancien** : `text-white`, `text-gray-100`, `text-gray-300`
- **Nouveau** : `text-gray-900`, `text-gray-800`, `text-gray-700`, `text-gray-600`

### Bordures
- **Ancien** : `border-white/5`, `border-white/10`
- **Nouveau** : `border-gray-200`, `border-gray-300`

### Cards/Containers
- **Ancien** : `bg-[#1a0b2e] border border-white/5`
- **Nouveau** : `bg-white border border-gray-200 shadow-sm`

## 🎯 Pattern de Remplacement

### Hero Section
```jsx
// Ancien
<div className="bg-gradient-to-r from-purple-900/40 to-blue-900/40 border border-white/10">
  <h1 className="text-white">Titre</h1>
  <p className="text-gray-300">Description</p>
</div>

// Nouveau
<div className="bg-gradient-to-r from-indigo-500 to-purple-600 border border-gray-200 shadow-lg">
  <h1 className="text-white">Titre</h1>
  <p className="text-white/90">Description</p>
</div>
```

### Cards
```jsx
// Ancien
<div className="bg-[#1a0b2e] border border-white/5 rounded-xl p-6">
  <h3 className="text-white font-semibold">Titre</h3>
  <p className="text-gray-400">Contenu</p>
</div>

// Nouveau
<div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
  <h3 className="text-gray-900 font-semibold">Titre</h3>
  <p className="text-gray-600">Contenu</p>
</div>
```

### Boutons Outline
```jsx
// Ancien
<Button variant="outline" className="border-white/10 bg-white/5 hover:bg-white/10 text-white">

// Nouveau
<Button variant="outline" className="border-gray-300 bg-white hover:bg-gray-50 text-gray-700">
```

## 📝 Checklist de Migration par Page

Pour chaque page, remplacer :

- [ ] `bg-[#0f0518]` → `bg-gray-50`
- [ ] `bg-[#1a0b2e]` → `bg-white` ou `bg-gray-100`
- [ ] `bg-purple-950` → `bg-gray-50`
- [ ] `text-white` → `text-gray-900` (sauf sur fond coloré)
- [ ] `text-gray-300` → `text-gray-700`
- [ ] `text-gray-400` → `text-gray-600`
- [ ] `border-white/5` → `border-gray-200`
- [ ] `border-white/10` → `border-gray-300`
- [ ] `hover:bg-white/5` → `hover:bg-gray-50`
- [ ] Vérifier les contrastes
- [ ] Tester les états hover/focus
- [ ] Vérifier la lisibilité


