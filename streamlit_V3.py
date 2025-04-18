import streamlit as st
from manim import *
from helper_V3 import *
from pathlib import Path
import matplotlib.pyplot as plt
import matplotlib.image as mpimg
import json
import time
import traceback

from streamlit_extras.floating_button import floating_button
from streamlit_extras.row import row
from streamlit_image_coordinates import streamlit_image_coordinates
from streamlit_extras.add_vertical_space import add_vertical_space

# Streamlit configuration
st.set_page_config(layout="wide", page_title="Système de Basketball")


def create_manim_animation(animation_sequence):
    """
    Fonction qui crée une animation manim à partir d'une séquence d'animation
    
    Parameters
    ----------
    animation_sequence : list
        La séquence d'animation à exécuter. Chaque élément de la liste doit être un dictionnaire
    
    Usage
    -----
    >>> animation_file = create_manim_animation(st.session_state.animation_sequence)
    >>> _, col_preview, _ = st.columns([1, 8, 1])
    >>> col_preview.video(str(animation_file), autoplay=True)
    """
    class Systeme_basketball(MovingCameraScene):
        def __init__(
            self,
            joueur1_init_pos=convert_coordinates_to_manim(st.session_state["player_positions"][0]),
            joueur2_init_pos=convert_coordinates_to_manim(st.session_state["player_positions"][1]),
            joueur3_init_pos=convert_coordinates_to_manim(st.session_state["player_positions"][2]),
            joueur4_init_pos=convert_coordinates_to_manim(st.session_state["player_positions"][3]),
            joueur5_init_pos=convert_coordinates_to_manim(st.session_state["player_positions"][4]),
            defenseur1_init_pos=(
                convert_coordinates_to_manim(st.session_state["defenseur_positions"][0])
                if st.session_state["defenseur_positions"][0] is not None
                else None
            ),
            defenseur2_init_pos=(
                convert_coordinates_to_manim(st.session_state["defenseur_positions"][1])
                if st.session_state["defenseur_positions"][1] is not None
                else None
            ),
            defenseur3_init_pos=(
                convert_coordinates_to_manim(st.session_state["defenseur_positions"][2])
                if st.session_state["defenseur_positions"][2] is not None
                else None
            ),
            defenseur4_init_pos=(
                convert_coordinates_to_manim(st.session_state["defenseur_positions"][3])
                if st.session_state["defenseur_positions"][3] is not None
                else None
            ),
            defenseur5_init_pos=(
                convert_coordinates_to_manim(st.session_state["defenseur_positions"][4])
                if st.session_state["defenseur_positions"][4] is not None
                else None
            ),
            player_number_has_ball=player_number_has_ball,
            **kwargs,
        ):
            super().__init__(**kwargs)
            self.joueur1 = Player(
                1, joueur1_init_pos, True if player_number_has_ball == 1 else False
            )
            self.joueur2 = Player(
                2, joueur2_init_pos, True if player_number_has_ball == 2 else False
            )
            self.joueur3 = Player(
                3, joueur3_init_pos, True if player_number_has_ball == 3 else False
            )
            self.joueur4 = Player(
                4, joueur4_init_pos, True if player_number_has_ball == 4 else False
            )
            self.joueur5 = Player(
                5, joueur5_init_pos, True if player_number_has_ball == 5 else False
            )

            self.defenseur1 = (
                Player(1, defenseur1_init_pos, False, defenseur=True)
                if defenseur1_init_pos is not None
                else None
            )
            self.defenseur2 = (
                Player(2, defenseur2_init_pos, False, defenseur=True)
                if defenseur2_init_pos is not None
                else None
            )
            self.defenseur3 = (
                Player(3, defenseur3_init_pos, False, defenseur=True)
                if defenseur3_init_pos is not None
                else None
            )
            self.defenseur4 = (
                Player(4, defenseur4_init_pos, False, defenseur=True)
                if defenseur4_init_pos is not None
                else None
            )
            self.defenseur5 = (
                Player(5, defenseur5_init_pos, False, defenseur=True)
                if defenseur5_init_pos is not None
                else None
            )

            player_with_ball = (
                self.joueur1
                if player_number_has_ball == 1
                else (
                    self.joueur2
                    if player_number_has_ball == 2
                    else (
                        self.joueur3
                        if player_number_has_ball == 3
                        else (
                            self.joueur4
                            if player_number_has_ball == 4
                            else self.joueur5
                        )
                    )
                )
            )
            # La balle est une courronne de couleur orange
            self.ball = Circle(
                radius=0.2,
                color=ORANGE,
            ).move_to(player_with_ball.position)

            # Pour sauvegarder l'état des joueurs et de la balle à différents moments
            self.animation_states = {}

            self.players = [
                self.joueur1,
                self.joueur2,
                self.joueur3,
                self.joueur4,
                self.joueur5,
            ]

            self.defenders = [
                self.defenseur1,
                self.defenseur2,
                self.defenseur3,
                self.defenseur4,
                self.defenseur5,
            ]

            # Display an empty text object to store the text of the current situation
            self.GLOBAL_SITUATION_TEXT = (
                Text("").scale(1.5).to_edge(DOWN + LEFT).set_opacity(0.5)
            )

        def save_state(self, name):
            current_state = {
                "players": {
                    f"joueur{i+1}": player.custom_save_state()
                    for i, player in enumerate(self.players)
                },
                "ball": self.ball.save_state(),
            }
            self.animation_states[name] = current_state

        def restore_state(self, name, new_text):
            self.wait(2)
            state = self.animation_states[name]
            for key, saved_state in state["players"].items():
                player_number = int(key[-1])
                player = self.players[player_number - 1]
                player.custom_restore_state(saved_state)
            ball_state = state["ball"]
            ball_restore_animation = Restore(ball_state, run_time=0.1)

            # Update the text
            new_text_mobject = (
                Text(new_text).scale(1.5).to_edge(DOWN + LEFT).set_opacity(0.5)
            )

            self.play(
                ball_restore_animation,
                Transform(
                    self.GLOBAL_SITUATION_TEXT,
                    new_text_mobject,
                ),
            )
            self.wait(2)

        def add_node(self, moves, time_arrangement, time_between):
            animations = []
            for value in moves:
                player_number = int(value[0])
                player = self.players[player_number - 1]
                method_name = value[-1]
                run_time = value[-2]
                args = value[1:-2]

                if method_name == "pass_ball":
                    target_player_number = args[0]
                    target_player = self.players[target_player_number - 1]
                    method = getattr(player, method_name)
                    animations.append(
                        method(self.ball, target_player, run_time=run_time)
                    )
                elif method_name == "move":
                    positions = args
                    # On applique convert_coordinates_to_manim pour chaque position
                    positions = [
                        convert_coordinates_to_manim(pos)
                        for pos in positions
                    ]
                    method = getattr(player, method_name)
                    animations.append(method(self.ball, *positions, run_time=run_time))
                elif method_name == "shoot_ball":
                    method = getattr(player, method_name)
                    animations.append(method(self.ball, run_time=run_time))

            animation_groups = []
            for _, indices in time_arrangement.items():
                group = AnimationGroup(*[animations[i] for i in indices])
                animation_groups.append(group)
            self.play(LaggedStart(*animation_groups, lag_ratio=time_between))

        def construct(self):            
            # ============================================================
            # ==================== SCENE INIT ============================
            # ============================================================

            # Add the image as background
            background = ImageMobject(BACKGROUND_PATH).scale(BACKGROUND_SCALE)
            self.add(background)

            # Write "Système 0" in the top middle of the screen
            title = Text(scene_name).scale(0.5).move_to(UP * 3.75)
            self.add(title)

            # Display all players
            self.add(
                *[player.manim_object for player in self.players],
            )

            # Display defenseurs if they are not None
            for defenseur in self.defenders:
                if defenseur is not None:
                    self.add(defenseur.manim_object)

            # Display the ball
            self.play(Create(self.ball))

            self.wait(1)

            # ============================================================
            # ==================== SCENE ANIMATIONS =======================
            # ============================================================

            for step in animation_sequence:
                action_type = step["type"]
                if action_type == "move":
                    self.add_node(
                        moves=step["moves"],
                        time_arrangement=step["time_arrangement"],
                        time_between=step["time_between"],
                    )
                elif action_type == "save_state":
                    self.save_state(name=step["name"])
                elif action_type == "restore_state":
                    self.restore_state(
                        name=step["name"],
                        new_text=step["new_text"],
                    )
                elif action_type == "wait":
                    self.wait(step["duration"])
                elif action_type == "write_text":
                    text_mobject = (
                        Text(step["text"])
                        .scale(step.get("scale", 1.5))
                        .to_edge(step.get("position", DOWN + LEFT))
                        .set_opacity(step.get("opacity", 0.5))
                    )
                    self.play(Transform(self.GLOBAL_SITUATION_TEXT, text_mobject))

            self.wait(1)

    temp_file = Path("media/videos/1080p60/Systeme_basketball.mp4")
    scene = Systeme_basketball()
    scene.render()
    return temp_file


def get_saved_states_names():
    """
    Récupère les noms des états sauvegardés dans la séquence d'animation.

    Returns
    -------
    list
        Liste des noms des états sauvegardés.
    """
    saved_states = [
        node["name"]
        for node in st.session_state.animation_sequence
        if node["type"] == "save_state"
    ]
    return saved_states


def show_player_on_court():
    img = mpimg.imread(BACKGROUND_PATH)
    fig, ax = plt.subplots(figsize=(10, 7))
    ax.set_xticks([])
    ax.set_yticks([])
    ax.imshow(img)

    # Afficher les joueurs en vert avec le numéro à l'intérieur
    for idx, pos in enumerate(st.session_state["player_positions"]):
        if pos is not None:
            # Convertir les coordonnées
            pos = convert_coordinates(pos[0], pos[1], pos[2], pos[3])
            # Afficher le joueur
            ax.plot(pos[0], pos[1], 'o', color='green', markersize=12)
            ax.text(pos[0], pos[1], str(idx+1), color='white', fontsize=10, fontweight='bold', ha='center', va='center')
            # Afficher la balle en orange (juste le contour d'un cercle)
            if idx + 1 == st.session_state["player_number_has_ball"]:
                ball_circle = plt.Circle((pos[0], pos[1]), 20, color='orange', fill=True, linewidth=10)
                ax.add_artist(ball_circle)

    # Afficher les défenseurs en rouge avec le numéro à l'intérieur
    if st.session_state["defenseur_active"]:
        for idx, pos in enumerate(st.session_state["defenseur_positions"]):
            if pos is not None:
                # Convertir les coordonnées
                pos = convert_coordinates(pos[0], pos[1])
                # Afficher le défenseur
                ax.plot(pos[0], pos[1], 'o', color='red', markersize=12)
                ax.text(pos[0], pos[1], str(idx+1), color='white', fontsize=10, fontweight='bold', ha='center', va='center')
    
    return fig


# ========================================================
# Modal pour afficher un message d'erreur
# ========================================================
@st.dialog("Message d'erreur", width="small")
def message_place(message):
    """
    Affiche un message d'erreur dans un modal
    """
    st.error(message)


# ========================================================
# Modal pour positionner un joueur sur le terrain
# ========================================================
@st.dialog("Positionnement des joueurs", width="large")
def positionnement_joueurs(numero_joueur, type="Joueur"):
    """
    Affiche un modal pour positionner un joueur sur le terrain
    """
    st.subheader("Positionnement d'un joueur")
    st.markdown("Cliquez sur le terrain pour positionner le joueur.")
    last_coordinates = streamlit_image_coordinates(BACKGROUND_PATH, use_column_width=True)
    if last_coordinates:
        # On récupère les coordonnées du dernier clic avec la taille et la largeur
        x, y, width, height = last_coordinates["x"], last_coordinates["y"], last_coordinates["width"], last_coordinates["height"]
        # On ajoute la position à la liste des positions
        key_session = "player_positions" if type == "player" else "defenseur_positions"
        st.session_state[key_session][numero_joueur - 1] = (x, y, width, height)
        # On ferme le modal
        st.rerun()


def generate_animation():
    # verifier si la positions de tous les joueurs est remplie
    for i, pos in enumerate(st.session_state["player_positions"]):
        if pos is None:
            message_place(f"Veuillez positionner le joueur {i+1} avant de lancer l'animation.")
            return
        
    # verifier si la sequence d'animation est remplie
    if len(st.session_state["animation_sequence"]) == 0:
        message_place("Veuillez ajouter au moins un node à l'animation.")
        return
    
    st.toast("Génération de l'animation en cours...")
    # Construction du dictionnaire
    animation_dict = {
        "joueur1_init_pos": st.session_state["player_positions"][0],
        "joueur2_init_pos": st.session_state["player_positions"][1],
        "joueur3_init_pos": st.session_state["player_positions"][2],
        "joueur4_init_pos": st.session_state["player_positions"][3],
        "joueur5_init_pos": st.session_state["player_positions"][4],
        "defenseur1_init_pos": st.session_state["defenseur_positions"][0],
        "defenseur2_init_pos": st.session_state["defenseur_positions"][1],
        "defenseur3_init_pos": st.session_state["defenseur_positions"][2],
        "defenseur4_init_pos": st.session_state["defenseur_positions"][3],
        "defenseur5_init_pos": st.session_state["defenseur_positions"][4],
        "player_number_has_ball": st.session_state["player_number_has_ball"],
        "scene_name": st.session_state["scene_name"],
        "animation_sequence": st.session_state["animation_sequence"]
    }
    
    try:
        video_file = create_manim_animation(animation_dict['animation_sequence'])
        st.toast("Vidéo générée avec succès !")
        video_place.video(str(video_file), autoplay=True)
    except Exception as e:
        error_trace = traceback.format_exc()
        message_place(f"Erreur lors de la génération de la vidéo : {e}")
        if DEBUG:
            print(error_trace)


# ========================================================
# ==================== INITIALISATION ====================
# ========================================================
if "animation_sequence" not in st.session_state:
    st.session_state.animation_sequence = []
if "player_positions" not in st.session_state:
    st.session_state["player_positions"] = [None] * NUM_JOUEURS
if "defenseur_positions" not in st.session_state:
    st.session_state["defenseur_positions"] = [None] * NUM_DEFENSEURS
if "defenseur_active" not in st.session_state:
    st.session_state["defenseur_active"] = False  # Indique si les défenseurs sont actifs
if "player_number_has_ball" not in st.session_state:
    st.session_state["player_number_has_ball"] = 1  # Numéro du joueur avec la balle
if "scene_name" not in st.session_state:
    st.session_state["scene_name"] = "Système de jeu"  # Nom de la scène
if "uploaded_file" not in st.session_state:
    st.session_state["uploaded_file"] = None

_, main_col, _ = st.columns([1, 5, 1])

with main_col:

    # =========================================================
    # ==================== HEADER =============================
    # =========================================================

    st.header(":orange[Basketball] Animation Creator")

    add_vertical_space(SPACE_BETWEEN_SECTIONS)
    
    # =========================================================
    # ==================== PARAMETRES =========================
    # =========================================================
    
    st.header(":blue[Paramètres] de l'animation", divider='blue')
    row2 = row([1, 3], vertical_align="center")
    player_number_has_ball = row2.number_input("Joueur avec la balle", min_value=1, max_value=5, value=st.session_state["player_number_has_ball"], step=1)
    scene_name = row2.text_input("Nom de la scène", value=st.session_state["scene_name"], placeholder="Système de jeu", max_chars=50)
    
    st.session_state["player_number_has_ball"] = player_number_has_ball
    st.session_state["scene_name"] = scene_name

    add_vertical_space(SPACE_BETWEEN_SECTIONS)

    # =========================================================
    # ==================== POSITIONNEMENT =====================
    # =========================================================

    st.header(":blue[Placement] des Joueurs et Défenseurs", divider='blue')
    row3 = row([1, 1, 1], vertical_align="center")
    row3.caption("Sélectionner le joueur ou défenseur à positionner sur le terrain")
    # On affecte directement la valeur renvoyée par le toggle à la variable de session
    st.session_state["defenseur_active"] = row3.toggle(
        "Ajouter les défenseurs dans l'animation", value=st.session_state["defenseur_active"]
    )
    
    col_img_placement, col_player_pick_placement = st.columns([3, 1], gap="medium", vertical_alignment="center")
    
    with col_img_placement:
        fig = show_player_on_court()
        st.pyplot(fig)
    
    with col_player_pick_placement:
        # Pour les joueurs
        for i in range(NUM_JOUEURS):
            label = f"{'🟢  Ajouter' if st.session_state['player_positions'][i] is None else '🟡  Modifier'} joueur {i+1}"
            if st.button(label, key=f"player_{i}", use_container_width=True):
                positionnement_joueurs(numero_joueur=i+1, type="player")
        
        st.divider()

        # Pour les défenseurs
        for i in range(NUM_DEFENSEURS):
            label = f"{'🟢  Ajouter' if st.session_state['defenseur_positions'][i] is None else '🟡  Modifier'} défenseur {i+1}"
            if st.button(label, key=f"defenseur_{i}", use_container_width=True):
                positionnement_joueurs(numero_joueur=i+1, type="defenseur")
        
        if st.button("❌ Supprimer les défenseurs", use_container_width=True):
            st.session_state["defenseur_positions"] = [None] * NUM_DEFENSEURS
            st.rerun()

        row_toggle_defenseurs = row([1, 2], vertical_align="center")

    add_vertical_space(SPACE_BETWEEN_SECTIONS)

# =========================================================
# ==================== ANIMATION ===========================
# =========================================================

main_col.header(":blue[Création] de l'animation", divider='blue')

# On coupe la main_col pour avoir un niveau de colonne supplémentaire
_, main_col1, main_col2, _ = st.columns([1, 1, 4, 1], gap="large", vertical_alignment="center")

with main_col1:
    add_vertical_space(2)
    action_type = st.selectbox(
        "Choisissez le type de node à ajouter:",
        ("Node d'actions", "save_state", "restore_state", "wait", "write_text"),
    )

with main_col2:
    if action_type == "Node d'actions":
        st.header(":red[Ajouter] des actions au Node", divider=False)
        
        num_actions = main_col1.number_input(
            "Nombre d'actions à ajouter:", min_value=1, value=1, step=1
        )

        list_action_dict = []

        for i in range(1, num_actions+1):
            with st.container(border=True):
                st.header(f":green[Action] numéro {i}", divider='green')
                col1, col2, col3 = st.columns(3)

                with col1:
                    player_number = st.number_input(
                        f"Numéro du joueur réalisant l'action {i}:",
                        min_value=1,
                        max_value=5,
                        step=1,
                        key=f"player_number_{i}",
                    )

                with col2:
                    action = st.selectbox(
                        f"Type d'action:",
                        ("move", "shoot_ball", "pass_ball"),
                        key=f"action_type_{i}",
                    )

                if action == "move":
                    key_positions_move = f"move_positions_{i}"
                    key_positions_show = f"{key_positions_move}_show"
                    key_positions_finished = f"{key_positions_move}_finished"

                    if key_positions_move not in st.session_state:
                        st.session_state[key_positions_move] = []
                        st.session_state[key_positions_finished] = False

                    if not st.session_state[key_positions_finished]:
                        if st.button("Ajouter les positions", key=f"show_positions_{key_positions_move}"):
                            st.session_state[key_positions_show] = True
                            st.rerun()

                        if st.session_state.get(key_positions_show, False):
                            st.write("Cliquez sur le terrain pour ajouter une position.")
                            coords = streamlit_image_coordinates(BACKGROUND_PATH, use_column_width=True, key=f"terrain_{key_positions_move}")

                            if coords:
                                new_point = (coords["x"], coords["y"], coords["width"], coords["height"])
                                if not st.session_state[key_positions_move] or st.session_state[key_positions_move][-1] != new_point:
                                    st.session_state[key_positions_move].append(new_point)
                                    st.rerun()

                            if st.button("Terminer", key=f"finish_{key_positions_move}"):
                                st.session_state[key_positions_finished] = True
                                st.session_state[key_positions_show] = False
                                st.toast("Sélection terminée.")
                                st.rerun()
                    else:
                        if st.button("Réinitialiser les positions", key=f"reset_{key_positions_move}"):
                            st.session_state[key_positions_move] = []
                            st.session_state[key_positions_finished] = False
                            st.rerun()

                    # Afficher les positions enregistrées
                    positions = st.session_state[key_positions_move]
                    st.write(f"Positions enregistrées: {len(positions)}")

                    if st.session_state[key_positions_finished] and positions:
                        fig, ax = plt.subplots(figsize=(10, 7))
                        img = mpimg.imread(BACKGROUND_PATH)
                        ax.imshow(img)
                        ax.axis('off')

                        for idx, pos in enumerate(positions):
                            points_coor_x, points_coor_y = convert_coordinates(pos[0], pos[1], pos[2], pos[3])
                            ax.plot(points_coor_x, points_coor_y, 'o', color='blue', markersize=12)
                            ax.text(points_coor_x, points_coor_y, str(idx+1), color='white', fontsize=10, ha='center', va='center')

                        st.pyplot(fig, use_container_width=True)

                    with col3:
                        run_time = st.number_input(
                            "Temps d'exécution de l'action:",
                            min_value=0.1,
                            step=0.1,
                            value=1.0,
                            key=f"run_time_{key_positions_move}"
                        )

                    positions_temp = positions.copy()
                    action_dict = {
                        "player_number": player_number,
                        "action": "move",
                        "positions": positions_temp,
                        "run_time": run_time,
                    }


                elif action == "shoot_ball":
                    run_time = col3.number_input(
                        f"Temps d'exécution de l'action {i}:",
                        min_value=0.1,
                        step=1.0,
                        value=1.0,
                        key=f"run_time_{i}",
                    )

                    action_dict = {
                        "player_number": player_number,
                        "action": action,
                        "run_time": run_time,
                    }

                elif action == "pass_ball":
                    target_player_number = col1.number_input(
                        f"Numéro du joueur recevant la passe:",
                        min_value=1,
                        max_value=5,
                        step=1,
                        key=f"target_player_{i}",
                    )
                    run_time = col3.number_input(
                        f"Temps d'exécution de l'action:",
                        min_value=0.1,
                        step=1.0,
                        value=1.0,
                        key=f"run_time_{i}",
                    )

                    action_dict = {
                        "player_number": player_number,
                        "action": action,
                        "target_player_number": target_player_number,
                        "run_time": run_time,
                    }

            list_action_dict.append(action_dict)
        
        add_vertical_space(2)
        
        with st.container(border=True):
            st.header(f":gray[Arrangement] temporel", divider='gray')
            col1, col2 = st.columns([2, 1])
            # 1) Nombre de groupes
            num_groups = col1.number_input(
                "Nombre de groupes",
                min_value=1,
                max_value=num_actions,
                value=1,
                step=1,
                key="num_groups"
            )

            # 2) Sélection des actions par groupe (sans doublons)
            available = list(range(num_actions))
            groups = []
            for grp_idx in range(num_groups):
                default_sel = available.copy() if grp_idx == 0 else []
                sel = col1.multiselect(
                    f"Groupe {grp_idx} – sélectionner les actions",
                    options=available,
                    default=default_sel,
                    key=f"group_{grp_idx}"
                )
                groups.append(sel)
                for a in sel:
                    if a in available:
                        available.remove(a)

            # 3) Temps entre chaque groupe
            time_between = col2.number_input(
                "Temps entre les groupes (s)",
                min_value=0.0,
                step=0.1,
                value=1.0,
                key="time_between_arrangement"
            )

            # 4) Validation et affichage
            total_assigned = sum(len(grp) for grp in groups)
            if total_assigned != num_actions:
                st.warning("Veuillez assigner **toutes** les actions aux groupes pour afficher l’arrangement.")
            else:
                # conversion pour affichage
                arrangement_str = convert_groups_to_str(groups)
                # st.markdown(f"**Arrangement temporel :**  {arrangement_str}")
                
                run_times = [action["run_time"] for action in list_action_dict]
                
                # 5) Calcul des temps de début et de fin
                starts = [None] * num_actions
                for idx, grp in enumerate(groups):
                    t0 = idx * time_between
                    for action_idx in grp:
                        starts[action_idx] = t0
                ends = [s + rt for s, rt in zip(starts, run_times)]

                # 6) Affichage du diagramme de Gantt
                bar_height = 0.4
                # figure height exactly fits bars
                fig, ax = plt.subplots(figsize=(8, num_actions * bar_height))
                
                # compute y positions so bars touch each other
                y_positions = [i * bar_height for i in range(num_actions)]
                
                ax.barh(
                    y=y_positions,
                    width=run_times,
                    left=starts,
                    height=bar_height,
                    align="edge"
                )
                
                # x-axis settings
                ax.set_xlim(0, max(ends))
                ax.set_xlabel("Temps (s)")
                
                # remove y-axis ticks and labels
                ax.set_yticks([])
                
                # ensure no extra margins
                ax.margins(y=0)
                
                # edge color
                for bar in ax.patches:
                    bar.set_edgecolor("black")
                
                # add action labels inside each bar
                for idx, rt in enumerate(run_times):
                    x_pos = starts[idx] + rt / 2
                    y_pos = y_positions[idx] + bar_height / 2
                    ax.text(x_pos, y_pos, f"Action {idx}", va="center", ha="center", color="white")
                
                # style: remove spines and grid
                for spine in ax.spines.values():
                    spine.set_visible(False)
                ax.grid(False)
                
                add_vertical_space(2)
                st.pyplot(fig)

        add_vertical_space(2)

        if st.button("Ajouter le Node d'actions"):
            # Vérification que chaque action "move" possède au moins une position
            error_number_of_action = False
            for action in list_action_dict:
                if action["action"] == "move" and not action["positions"]:
                    error_number_of_action = True
                    break

            # Tester si un joueur est assigné à deux actions dans un Node (si oui => erreur)
            player_numbers = [action["player_number"] for action in list_action_dict]
            if len(player_numbers) != len(set(player_numbers)):
                st.error(
                    "Un joueur ne peut pas être assigné à deux actions dans un Node."
                )
            
            # Vérifier que toutes les actions ont été groupées
            if total_assigned != num_actions:
                st.error("Chaque action doit appartenir à un groupe pour ajouter le Node.")
            
            elif error_number_of_action:
                st.error("Pour chaque action 'move', veuillez sélectionner au moins une position.")

            else:    
                # Tout est OK → construction du node
                node = {
                    "type": "move",
                    "moves": [],
                    "time_arrangement": {str(idx): grp for idx, grp in enumerate(groups) if grp},
                    "time_between": time_between,
                }

                for idx, action in enumerate(list_action_dict):
                    player_num_str = str(action["player_number"])
                    if action["action"] == "move":
                        node["moves"].append(
                            [player_num_str]
                            + action["positions"]
                            + [
                                action["run_time"],
                                action["action"],
                            ]
                        )
                    elif action["action"] == "shoot_ball":
                        node["moves"].append(
                            [player_num_str]
                            + [
                                action["run_time"],
                                action["action"],
                            ]
                        )
                    elif action["action"] == "pass_ball":
                        node["moves"].append(
                            [player_num_str]
                            + [
                                action["target_player_number"],
                                action["run_time"],
                                action["action"],
                            ]
                        )

                st.session_state.animation_sequence.append(node)
                st.success("Node d'actions ajouté à la séquence.")
                

    elif action_type == "save_state":
        st.header(":red[Sauvegarder] l'état", divider=False)
        with st.container(border=True):
            state_name = st.text_input("Nom de l'état à sauvegarder:")
            if st.button("Sauvegarder l'état"):
                action = {"type": "save_state", "name": state_name}
                st.session_state.animation_sequence.append(action)
                st.success("État sauvegardé et ajouté à la séquence.")

    elif action_type == "restore_state":
        st.header(":red[Restaurer] l'état", divider=False)
        with st.container(border=True):
            state_name = st.selectbox(
                "Sélectionner l'état à restaurer:", get_saved_states_names(),
                index=0
            )
            new_text = st.text_input("Nouveau texte:")
            if st.button("Restaurer l'état"):
                action = {"type": "restore_state", "name": state_name, "new_text": new_text}
                st.session_state.animation_sequence.append(action)
                st.success("Restaurer l'état ajouté à la séquence.")

    elif action_type == "wait":
        st.header(":red[Ajouter] une pause", divider=False)
        with st.container(border=True):
            duration = st.number_input(
                "Durée de pause:", min_value=0.1, step=0.1, value=1.0
            )
            if st.button("Ajouter la pause"):
                action = {"type": "wait", "duration": duration}
                st.session_state.animation_sequence.append(action)
                st.success("Pause ajoutée à la séquence.")

    elif action_type == "write_text":
        st.header(":red[Ajouter] du texte", divider=False)
        st.caption(
            "Le texte sera affiché en bas à gauche de l'écran, à la place du texte déjà existant."
        )
        with st.container(border=True):
            text = st.text_input("Texte à afficher:")

            if st.button("Ajouter le texte"):
                action = {
                    "type": "write_text",
                    "text": text,
                }
                st.session_state.animation_sequence.append(action)
                st.success("Texte ajouté à la séquence.")

add_vertical_space(SPACE_BETWEEN_SECTIONS)

# ==========================================================
# ================ EN LANGAGE NATUREL ======================
# ==========================================================

# On reprend une colonne centrale pour afficher la fin de la page
_, end_main_col, _ = st.columns([1, 5, 1], gap="large")

with end_main_col:
    st.header(":blue[Description] en langage naturel", divider='blue')

    # Construction du dictionnaire
    animation_dict = {
        "joueur1_init_pos": st.session_state["player_positions"][0],
        "joueur2_init_pos": st.session_state["player_positions"][1],
        "joueur3_init_pos": st.session_state["player_positions"][2],
        "joueur4_init_pos": st.session_state["player_positions"][3],
        "joueur5_init_pos": st.session_state["player_positions"][4],
        "defenseur1_init_pos": st.session_state["defenseur_positions"][0],
        "defenseur2_init_pos": st.session_state["defenseur_positions"][1],
        "defenseur3_init_pos": st.session_state["defenseur_positions"][2],
        "defenseur4_init_pos": st.session_state["defenseur_positions"][3],
        "defenseur5_init_pos": st.session_state["defenseur_positions"][4],
        "player_number_has_ball": st.session_state["player_number_has_ball"],
        "scene_name": st.session_state["scene_name"],
        "animation_sequence": st.session_state["animation_sequence"]
    }

    # for i, node in enumerate(animation_dict["animation_sequence"]):
        # st.write(f"**Node {i + 1}** : {node_to_natural_language(node)}")


    def display_node(node, idx):
        with st.expander(f"**Node {idx + 1}**: {node['type']}", expanded=True):
            st.write(node_to_natural_language(node))

            # Colonnes pour les boutons
            col_del, col_up, col_down, col_edit = st.columns(4)

            with col_del:
                if st.button("Supprimer", key=f"delete_{idx}"):
                    st.session_state.animation_sequence.pop(idx)
                    st.success(f"Node {idx + 1} supprimé.")
                    st.rerun()

            with col_up:
                if idx > 0:
                    if st.button("Monter", key=f"move_up_{idx}"):
                        (
                            st.session_state.animation_sequence[idx],
                            st.session_state.animation_sequence[idx - 1],
                        ) = (
                            st.session_state.animation_sequence[idx - 1],
                            st.session_state.animation_sequence[idx],
                        )
                        st.rerun()

            with col_down:
                if idx < len(st.session_state.animation_sequence) - 1:
                    if st.button("Descendre", key=f"move_down_{idx}"):
                        (
                            st.session_state.animation_sequence[idx],
                            st.session_state.animation_sequence[idx + 1],
                        ) = (
                            st.session_state.animation_sequence[idx + 1],
                            st.session_state.animation_sequence[idx],
                        )
                        st.rerun()

            with col_edit:
                if st.button("Modifier", key=f"edit_{idx}"):
                    # On passe en mode édition
                    st.session_state["edit_node_index"] = idx
                    # On copie le node courant (pour éviter de modifier direct dans l'original avant sauvegarde)
                    st.session_state["edit_node_data"] = node.copy()
                    st.rerun()


    def edit_node_form(node, idx):
        st.write(f"**Modification du Node {idx + 1}**")

        # En fonction du type du node, on affiche différents champs
        # Exemple avec un node de type "move"
        if node["type"] == "move":
            # On imagine que le node contient un champ "moves", "time_between", etc.
            # Affichez des inputs pour modifier ces champs
            # Exemple fictif :
            st.write("Éditer un node de type 'move'")

            # Si, par exemple, votre node contient un champ "time_between"
            new_time_between = st.number_input(
                "Temps entre les actions", value=node.get("time_between", 1.0)
            )
            node["time_between"] = new_time_between

            # Ajoutez d'autres inputs selon la structure du node
            # ...

        elif node["type"] == "save_state":
            new_name = st.text_input("Nom de l'état", value=node.get("name", ""))
            node["name"] = new_name

        # ... faire de même pour les autres types (restore_state, wait, write_text)

        # Bouton d'enregistrement
        if st.button("Enregistrer"):
            # Mise à jour du node dans la séquence
            st.session_state.animation_sequence[idx] = node
            st.success("Node mis à jour avec succès.")
            # On sort du mode édition
            del st.session_state["edit_node_index"]
            del st.session_state["edit_node_data"]
            st.rerun()

        # Bouton d'annulation
        if st.button("Annuler"):
            del st.session_state["edit_node_index"]
            del st.session_state["edit_node_data"]
            st.info("Modification annulée.")
            st.rerun()


    # Code principal
    if "edit_node_index" in st.session_state:
        # On est en mode édition
        edit_node_form(
            st.session_state["edit_node_data"], st.session_state["edit_node_index"]
        )
    else:
        # Affichage normal de la liste
        if st.session_state.animation_sequence:
            for idx, node in enumerate(st.session_state.animation_sequence):
                display_node(node, idx)
        else:
            st.info("Aucune action n'a été ajoutée à la séquence.")

    add_vertical_space(SPACE_BETWEEN_SECTIONS)

    # ==========================================================
    # ==================== VIDEO ===============================
    # ==========================================================

    st.header(":blue[Vidéo] de l'animation", divider='blue')
    video_place = st.empty()
    video_place.info("Aucune vidéo générée.")
    
    add_vertical_space(SPACE_BETWEEN_SECTIONS)
    
    # ==========================================================
    # =============== EXPORTER L'ANIMATION =====================
    # ==========================================================
    st.header(":blue[Exporter] l'animation", divider='blue')
    st.caption("Vous pouvez ici exporter l'animation au format txt pour la réutiliser plus tard. Ce la conservera tous les paramètres de l'animation. (pas la vidéo)")
    # télécharger le json d'animation 
    animation_dict = {
        "joueur1_init_pos": st.session_state["player_positions"][0],
        "joueur2_init_pos": st.session_state["player_positions"][1],
        "joueur3_init_pos": st.session_state["player_positions"][2],
        "joueur4_init_pos": st.session_state["player_positions"][3],
        "joueur5_init_pos": st.session_state["player_positions"][4],
        "defenseur1_init_pos": st.session_state["defenseur_positions"][0],
        "defenseur2_init_pos": st.session_state["defenseur_positions"][1],
        "defenseur3_init_pos": st.session_state["defenseur_positions"][2],
        "defenseur4_init_pos": st.session_state["defenseur_positions"][3],
        "defenseur5_init_pos": st.session_state["defenseur_positions"][4],
        "player_number_has_ball": st.session_state["player_number_has_ball"],
        "scene_name": st.session_state["scene_name"],
        "animation_sequence": st.session_state["animation_sequence"]
    }
    json_file = json.dumps(animation_dict, indent=4)
    st.download_button(
        label="Télécharger le fichier en format txt",
        data=json_file,
        file_name="animation.txt",
        icon="📥",
    )
    
    add_vertical_space(SPACE_BETWEEN_SECTIONS)
    
    # ==========================================================
    # ============== IMPORTER UNE ANIMATION ====================
    # ==========================================================
    st.header(":blue[Importer] une animation", divider='blue')
    uploaded_file = st.file_uploader("Télécharger une animation au format txt", type=["txt"], key="uploader")

    # Stocker le nom du fichier dans la session pour comparer ultérieurement
    if uploaded_file is not None:
        st.session_state["uploaded_file"] = uploaded_file
        st.session_state["uploaded_file_name"] = uploaded_file.name

    # Traiter le fichier uploadé uniquement si le fichier est présent et que l'import n'a pas encore été effectué
    if st.session_state.get("uploaded_file") is not None and not st.session_state.get("animation_imported", False):
        file_obj = st.session_state["uploaded_file"]
        file_obj.seek(0)  # S'assurer que le curseur est au début
        file_content = file_obj.read()
        try:
            animation_dict = json.loads(file_content)
        except Exception as e:
            st.error(f"Erreur lors du décodage du fichier JSON : {e}")
        else:
            st.session_state["player_positions"] = [animation_dict[f"joueur{i+1}_init_pos"] for i in range(NUM_JOUEURS)]
            st.session_state["defenseur_positions"] = [animation_dict[f"defenseur{i+1}_init_pos"] for i in range(NUM_DEFENSEURS)]
            st.session_state["player_number_has_ball"] = animation_dict["player_number_has_ball"]
            st.session_state["scene_name"] = animation_dict["scene_name"]
            st.session_state.animation_sequence = animation_dict["animation_sequence"]
            st.session_state["animation_imported"] = True  # flag pour éviter la boucle
            st.toast("Animation importée avec succès.")
            st.balloons()
            time.sleep(1)
            st.rerun()

if floating_button("Générer l'animation", icon="⚙️"):
    generate_animation()
