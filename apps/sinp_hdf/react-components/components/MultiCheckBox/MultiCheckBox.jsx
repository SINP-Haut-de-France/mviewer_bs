import React, { useState, useEffect } from 'react';
import MultiCheckBoxUI from './MultiCheckBoxUI';

const MultiCheckBox = ({
  datasource = [], // Source de données (tableau ou URL JSON)
  libelle = '',
  label = '{{value}} - {{label}}',
  selectedKey = 'id', // Clé unique utilisée pour les éléments sélectionnés
  multiselect = true, // Toujours true pour cocher plusieurs éléments
  canCheckAll = false, // Incluture de "Tout cocher"/"Tout décocher"
  onChange = () => {}, // Callback lors d'une modification de sélection
}) => {
  const [data, setData] = useState([]);
  const [selected, setSelected] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false); // Réduit par défaut

  // Charger la datasource au montage
  useEffect(() => {
    const fetchData = async () => {
      if (typeof datasource === 'string') {
        setIsLoading(true);
        try {
          const response = await fetch(datasource);
          if (!response.ok) throw new Error('Erreur lors du chargement des données.');
          const result = await response.json();
          setData(result);
        } catch (err) {
          setError(err.message);
        } finally {
          setIsLoading(false);
        }
      } else if (Array.isArray(datasource)) {
        setData(datasource); // Utiliser un tableau directement
      } else {
        setError("Le datasource doit être un tableau ou une URL.");
      }
    };

    fetchData();
  }, [datasource]);

  // Gestion de la sélection/dé-sélection d'un élément
  const handleToggle = (item) => {
    const itemKey = item[selectedKey];
    const isSelected = selected.find((el) => el[selectedKey] === itemKey);

    const newSelected = isSelected
      ? selected.filter((el) => el[selectedKey] !== itemKey) // Retirer si déjà sélectionné
      : [...selected, item]; // Ajouter si pas sélectionné

    setSelected(newSelected);
    onChange(newSelected);
  };

  // Gestion de "Tout cocher/décocher"
  const handleToggleAll = (isChecked) => {
    if (isChecked) {
      setSelected([...data]); // Sélectionner tous les éléments
      onChange([...data]);
    } else {
      setSelected([]); // Tout décocher
      onChange([]);
    }
  };

  function formatLabel(template, item) {
    return template.replace(/{{(.*?)}}/g, (_, key) => item[key.trim()] || '');
  }


  // Vérifie si tous les éléments sont cochés
  const areAllChecked = selected.length === data.length;

  // Gérer l'extension/réduction du composant
  const toggleExpand = () => setIsExpanded(!isExpanded);

  return (
    <MultiCheckBoxUI
      libelle={libelle}
      label={label}
      multiselect={multiselect}
      data={data}
      selected={selected}
      error={error}
      isLoading={isLoading}
      selectedKey={selectedKey} // Transmettre explicitement selectedKey !
      handleToggle={handleToggle}
      handleToggleAll={handleToggleAll}
      isExpanded={isExpanded}
      toggleExpand={toggleExpand}
      canCheckAll={canCheckAll}
      areAllChecked={areAllChecked}
    />
  );
};

export default MultiCheckBox;