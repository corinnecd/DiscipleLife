# Charte Graphique - Boutons

## RÈGLE FONDAMENTALE
**❌ INTERDIT :** Ne jamais utiliser de fond noir (`bg-black`, `bg-gray-900`, `bg-slate-900`) ou de contour noir (`border-black`, `border-gray-900`) pour les boutons.

## Couleurs autorisées pour les boutons

### Boutons Principaux (Actions principales)
- **Bleu** : `bg-blue-600 hover:bg-blue-700 text-white`
- **Violet/Pourpre** : `bg-purple-600 hover:bg-purple-700 text-white`
- **Dégradé Violet-Rose** : `bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white`

### Boutons Secondaires (Actions secondaires)
- **Gris clair par défaut** : `bg-gray-200 hover:bg-gray-300 text-gray-900` (style par défaut recommandé)
- **Outline avec gris clair** : `variant="outline" className="border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-gray-700"`
- **Outline avec violet** : `variant="outline" className="border-purple-300 hover:bg-purple-50 hover:border-purple-400 text-purple-700"`
- **Ghost** : `variant="ghost" className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"`

### Boutons Spéciaux
- **Teal/Turquoise** : `bg-teal-600 hover:bg-teal-700 text-white` (pour actions spéciales)
- **Rouge** : `bg-red-500 hover:bg-red-600 text-white` (pour actions destructives uniquement)

## Exemples de bonnes pratiques

### ✅ BON
```jsx
// Bouton principal
<Button className="bg-blue-600 hover:bg-blue-700 text-white">
  Action principale
</Button>

// Bouton gris clair (style par défaut recommandé)
<Button className="bg-gray-200 hover:bg-gray-300 text-gray-900">
  Action secondaire
</Button>

// Bouton outline
<Button variant="outline" className="border-gray-200 hover:bg-gray-50 text-gray-700">
  Action secondaire alternative
</Button>

// Bouton avec dégradé
<Button className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white">
  Action spéciale
</Button>
```

### ❌ MAUVAIS
```jsx
// ❌ Fond noir
<Button className="bg-black text-white">...</Button>

// ❌ Contour noir
<Button variant="outline" className="border-black">...</Button>

// ❌ Fond gris très foncé
<Button className="bg-gray-900 text-white">...</Button>
```

## Règle à respecter
**TOUJOURS** utiliser des couleurs claires et lumineuses pour les boutons. Les fonds noirs ou très sombres sont réservés aux arrière-plans de modales ou overlays, jamais aux boutons interactifs.
