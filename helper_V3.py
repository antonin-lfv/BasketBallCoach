# main_script.py
from manim import *


# Configuration
NUM_JOUEURS = 5
NUM_DEFENSEURS = 5
SPACE_BETWEEN_SECTIONS = 5
BACKGROUND_PATH = "images/basketball_court_4K.png"
BACKGROUND_SCALE = 0.485
DEBUG = False

# ========== Functions ==========

def convert_coordinates(x, y):
    """
    Convertit les coordonnées d'un clic sur l'image affichée (703x460)
    aux coordonnées correspondantes sur l'image originale (3424x2240).

    Dans l'image affichée, l'origine (0, 0) est en haut à gauche.

    Ici, on suppose que l'image originale possède son origine en bas à gauche.

    Parameters
    ----------
    x : float
        Coordonnée x sur l'image affichée.
    y : float
        Coordonnée y sur l'image affichée (origine en haut).

    Returns
    -------
    tuple
        (converted_x, converted_y) dans l'image originale.
    """
    scale_x = 3424 / 703
    scale_y = 2240 / 460
    
    converted_x = x * scale_x
    converted_y = y * scale_y 

    return converted_x, converted_y


def convert_coordinates(x, y, original_width, original_height, target_width=3424, target_height=2240):
    """
    Convertit les coordonnées d'un clic sur l'image affichée (original_width, original_height)
    aux coordonnées correspondantes sur l'image originale (target_width, target_height).

    Dans l'image affichée, l'origine (0, 0) est en haut à gauche.

    Ici, on suppose que l'image originale possède son origine en bas à gauche.

    Parameters
    ----------
    x : float
        Coordonnée x sur l'image affichée.
    y : float
        Coordonnée y sur l'image affichée (origine en haut).

    Returns
    -------
    tuple
        (converted_x, converted_y) dans l'image originale.
    """
    
    scale_x = target_width / original_width
    scale_y = target_height / original_height
    
    converted_x = x * scale_x
    converted_y = y * scale_y 

    return converted_x, converted_y


def convert_coordinates_to_manim(coords):
    """
    Convertit les coordonnées d'un point sur l'image originale (origine en haut à gauche)
    en coordonnées dans l'espace manim, où le centre (0,0) est au milieu, l'axe x va de -6.2 à 6.2
    et l'axe y de -4 à 4.

    Dans l'image :
      - (0, 0) est en haut à gauche
      - (width, height) est en bas à droite (les dimensions de l'image fournie avec les coords)

    Dans manim :
      - Pour l'axe x, la plage totale est de 12.4 (de -6.2 à 6.2)
      - Pour l'axe y, la plage totale est de 8 (de -4 à 4), et l'axe y est inversé

    La conversion est la suivante :
      - manim_x = image_x * (12.4 / width) - 6.2
      - manim_y = 4 - image_y * (8 / height)

    Parameters
    ----------
    coords : tuple
        Les coordonnées à convertir, sous la forme [x, y, width, height]

    Returns
    -------
    tuple
        Les coordonnées converties dans l'espace manim, sous la forme [x, y, 0]
    """
    image_x, image_y, width, height = coords

    scale_x = 12.4 / width   # Conversion linéaire pour x
    scale_y = 8 / height      # Conversion linéaire pour y

    manim_x = image_x * scale_x - 6.2
    manim_y = 4 - image_y * scale_y

    return (manim_x, manim_y, 0)


def node_to_natural_language(node):
    """
    Transform a brute node to a natural language description.
    """
    if node["type"] == "move":
        natural_language = ""
        for idx, action in enumerate(node["moves"]):
            player_number = action[0]
            player_number = int(player_number)
            if action[-1] == "move":
                natural_language += f"\n- **action {idx}** : le joueur {player_number} se déplace. Durée: {action[-2]} secondes"
            elif action[-1] == "shoot_ball":
                natural_language += f"\n- **action {idx}** : le joueur {player_number} tire. Durée: {action[-2]} secondes"
            elif action[-1] == "pass_ball":
                natural_language += f"\n- **action {idx}** : le joueur {player_number} passe la balle au joueur {action[1]}. Durée: {action[-2]} secondes"

        ta = node.get("time_arrangement", {})
        if len(ta) > 1:
            natural_language += (
                f"\n- Temps entre les groupes d'actions : {node['time_between']} s"
            )
            # Construire une chaîne décrivant les groupes, ex. "0:0,1;1:2,3"
            group_str = "; ".join(
                f"{batch}→[{','.join(map(str, acts))}]"
                for batch, acts in sorted(ta.items(), key=lambda x: int(x[0]))
            )
            natural_language += f" ({group_str})"
        else:
            natural_language += "\n- Toutes les actions commencent en même temps."

    elif node["type"] == "save_state":
        natural_language = f"État sauvegardé sous le nom '{node['name']}'."
    elif node["type"] == "restore_state":
        natural_language = f"Restaurer l'état sauvegardé sous le nom '{node['name']}' avec le nouveau texte '{node['new_text']}'."
    elif node["type"] == "wait":
        natural_language = f"Attendre {node['duration']} secondes."
    elif node["type"] == "write_text":
        natural_language = f"Écrire le texte '{node['text']}' à l'écran."

    return natural_language


# Fonction pour convertir les groupes en format interne (ex. "0:0,1;1:2,3")
def convert_groups_to_str(groups):
    """
    Convertit une liste de groupes (listes d'indices) en chaîne de la forme "0:0,1;1:2,3".
    Les groupes vides sont supprimés et les indices de batch sont renumérotés.
    """
    print(f"Groupes avant filtrage : {groups}")
    # Filtrer les groupes non vides
    non_empty_groups = [grp for grp in groups if grp]
    print(f"Groupes non vides : {non_empty_groups}")
    # Construire la chaîne en renumérotant les batches
    return ";".join(
        f"{new_idx}:{','.join(str(i) for i in grp)}"
        for new_idx, grp in enumerate(non_empty_groups)
    )


# ========== Classes ==========

class Position:
    """
    Enum with all positions on a basketball court
    """

    post_45_gauche_loin = [-5, -2, 0]
    post_45_droit_loin = [5, -2, 0]
    post_0_droit = [6, 3, 0]
    post_0_gauche = [-6, 3, 0]
    post_90_loin = [0, -3.7, 0]
    post_ailier_gauche = [-2, 2, 0]
    post_ailier_droit = [2, 2, 0]
    post_lancer_franc = [0, -1.5, 0]
    post_lancer_franc_gauche = [-2, -1.5, 0]
    post_lancer_franc_haut = [0, -3, 0]
    post_lancer_franc_gauche_haut = [-2, -3, 0]
    post_lancer_franc_droit_haut = [2, -3, 0]
    touche_cote_gauche = [-6.5, -2, 0]
    touche_cote_droit = [6.5, -2, 0]
    touche_fond_gauche = [-4, 3.7, 0]
    touche_fond_droit = [4, 3.7, 0]
    net_position = [0, 2.3, 0]


class Player:
    def __init__(self, number, position, has_ball, defenseur=False):
        self.number = number  # i.e. 1, 2, 3, 4, 5
        self.position = (
            position  # i.e. Position.post_45_gauche_loin (array of 3 elements)
        )
        self.has_ball = has_ball  # boolean
        self.defenseur = defenseur  # True if it's a defenseur
        color = GREEN if not defenseur else ManimColor("#FF0000")
        # Manim object representing the player (BLACK for attacker, RED for defenseur)
        self.manim_object = LabeledDot(Tex(number, color=WHITE)).move_to(
            position
        ).scale(0.7).set_color(color)
        self.manim_object.set_stroke(
            color=WHITE,
            width=2,
            opacity=1,
        )

    def move(self, ball, *positions_list, run_time=3):
        """
        Move a player from position1 to position2

        ball: Ball object
        manim_class: Manim class
        *positions_list: list of positions to move to (excluding the starting position)
        """
        animations = []

        path = VMobject()
        # On garde les 2 premières valeurs de la position car les 2 autres sont les dimensions de la fenêtre, et on ajoute z=0
        path.set_points_smoothly(
            [self.manim_object.get_center()] + [(position[0], position[1], 0) for position in positions_list]
        )

        if self.has_ball:
            # Display the path and move player with ball
            animations.extend(
                [
                    MoveAlongPath(ball, path, run_time=run_time, rate_func=linear),
                    MoveAlongPath(
                        self.manim_object, path, run_time=run_time, rate_func=linear
                    ),
                ]
            )
        else:
            animations.extend(
                [
                    MoveAlongPath(
                        self.manim_object, path, run_time=run_time, rate_func=linear
                    )
                ]
            )

        self.position = positions_list[-1]

        return animations

    def pass_ball(self, ball, player, run_time=1):
        """
        Pass the ball to another player

        player: Player object
        ball: Ball object
        """
        assert self.has_ball, f"Player {self.number} has no ball to pass"
        path = VMobject()
        path.set_points_smoothly(
            [self.manim_object.get_center(), player.manim_object.get_center()]
        )
        # update players' ball status
        self.has_ball = False
        player.has_ball = True
        return [MoveAlongPath(ball, path, run_time=run_time, rate_func=linear)]

    def shoot_ball(self, ball, run_time=1):
        """
        Shoot the ball to a position

        position: list of 3 elements
        ball: Ball object
        """

        path = VMobject()
        path.set_points_smoothly(
            [self.manim_object.get_center(), Position.net_position]
        )
        # update players' ball status
        self.has_ball = False
        # scale ball to 0.8 and color to black
        ball.scale(0.6).set_color(BLACK)
        ball_movment = [MoveAlongPath(ball, path, run_time=run_time, rate_func=linear)]
        return ball_movment

    def custom_save_state(self):
        """
        Custom method to save the player's state, because we save more than just the manim_object (ball, etc.)
        """
        return {
            "position": self.position,
            "has_ball": self.has_ball,
            "defenseur": self.defenseur,
        }

    def custom_restore_state(self, state):
        """
        Custom method to restore the player's state
        """
        self.position = state["position"]
        self.has_ball = state["has_ball"]
        self.defenseur = state["defenseur"]
        self.manim_object.move_to(self.position)
