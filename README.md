# BasketballCoach — Animation Creator

Une application Streamlit pour créer des **séquences d’animation** de systèmes de jeu de basketball, avec génération vidéo via Manim.

---

## 📋 Présentation

Cette appli permet de :
- **Placer** des attaquants et des défenseurs sur un terrain de basketball.
- **Définir** une suite d’actions (déplacements, tirs, passes) pour les différents attaquants. 
- Créer différents **scénarios** de jeu dnas une même animation en ajoutant des points de sauvegarde et en les organisant dans un ordre spécifique.
- **Générer** une vidéo animée du système de jeu avec Manim.
- **Exporter/importer** la configuration pour la réutilisation ultérieure.
- **Obtenir** une description en langage naturel de la séquence.

## 🚀 Lancer l'application

```bash
uv run streamlit run main.py
```

Pour installer `uv`, voir la doc [ICI](https://docs.astral.sh/uv/).

Si problème avec Latex lors de la génération de l'animation, se référer à la documentation pour l'installer [ICI](https://docs.manim.community/en/stable/installation/uv.html#step-2-optional-installing-latex).

