// ui.ts
import $ from 'jquery';
import { Jugador } from './jugador';
import { Naipe } from './naipe';
import { Canto } from './types';
import { IA } from './ia.placeholder'; // Para diferenciar Jugador de IA si es necesario

export class UIHandler {
  private readonly logElement: JQuery<HTMLElement>;
  private readonly score1Element: JQuery<HTMLElement>;
  private readonly score2Element: JQuery<HTMLElement>;
  private readonly name1Element: JQuery<HTMLElement>;
  private readonly name2Element: JQuery<HTMLElement>;
  private readonly playerCards1Container: JQuery<HTMLElement>;
  private readonly playerCards2Container: JQuery<HTMLElement>;
  private readonly playedCardsContainer: JQuery<HTMLElement>; // Contenedor de la mesa
  private readonly player1Voice: JQuery<HTMLElement>;
  private readonly player2Voice: JQuery<HTMLElement>;
  private readonly player1NameBoard: JQuery<HTMLElement>; // Nombre en el tablero
  private readonly player2NameBoard: JQuery<HTMLElement>; // Nombre en el tablero

  constructor(private imageBasePath: string = './cartas/mazoOriginal') {
    this.logElement = $('#log');
    // Selectores del marcador
    const scoreTable = $('#game-score');
    this.score1Element = scoreTable.find('.player-one-points');
    this.score2Element = scoreTable.find('.player-two-points');
    this.name1Element = scoreTable.find('.player-one-name'); // Nombre en tabla de puntajes
    this.name2Element = scoreTable.find('.player-two-name'); // Nombre en tabla de puntajes
    // Selectores de áreas de jugadores
    this.playerCards1Container = $('#player-one .player-cards');
    this.playerCards2Container = $('#player-two .player-cards');
    this.player1Voice = $('#player-one .player-voice');
    this.player2Voice = $('#player-two .player-voice');
    this.player1NameBoard = $('#player-one .player-name'); // Nombre sobre las cartas
    this.player2NameBoard = $('#player-two .player-name'); // Nombre sobre las cartas
    // Selector de la mesa
    this.playedCardsContainer = $('.game-deck .cards'); // Asumiendo un div con clase 'cards' dentro de 'game-deck'
  }

  // --- Métodos de Actualización del Estado Visual ---

  displayLog(message: string): void {
    this.logElement.prepend(message + '<br />');
    // Opcional: Limitar tamaño del log
    // const maxLogLines = 50;
    // if (this.logElement.children('br').length > maxLogLines) {
    //    this.logElement.find('br:gt(' + (maxLogLines - 1) + ')').remove(); // Quita excedente
    //    this.logElement.html(this.logElement.html().substring(0, this.logElement.html().lastIndexOf('<br/>'))); // Ajusta final
    // }
  }

  clearLog(): void {
      this.logElement.html('');
  }

  updateScores(score1: number, score2: number): void {
    this.score1Element.text(score1);
    this.score2Element.text(score2);
  }

  updatePlayerNames(name1: string, name2: string): void {
    this.name1Element.text(name1);
    this.name2Element.text(name2);
    this.player1NameBoard.text(name1);
    this.player2NameBoard.text(name2);
  }

  /** Muestra las cartas en la mano de un jugador */
  displayPlayerCards(jugador: Jugador): void {
    const container = jugador.esHumano ? this.playerCards1Container : this.playerCards2Container;
    container.empty(); // Limpiar cartas anteriores

    jugador.cartasEnMano.forEach((carta, index) => {
      const li = $('<li></li>');
      if (jugador.esHumano) {
        // Carta humana: Imagen clickeable
        const img = $('<img>')
          .attr('src', carta.getImageSrc(this.imageBasePath))
          .addClass('naipe naipe-humano')
          .attr('data-naipe-index', index)
          .attr('alt', carta.getNombre());
        const a = $('<a href="#"></a>').append(img); // Envolver en <a> para estilo/evento
        li.append(a);
      } else {
        // Carta IA: Dorso (o imagen boca abajo)
        const img = $('<img>')
            .attr('src', `${this.imageBasePath}/dorso.png`) // Asegúrate de tener dorso.png
            .addClass('naipe naipe-boca-abajo')
            .attr('alt', 'Carta Oponente');
         li.append(img);
         // O usar una clase CSS para el dorso: li.addClass('naipe naipe-boca-abajo');
      }
      container.append(li);
    });
  }

  /** Limpia las cartas jugadas en la mesa */
  clearPlayedCards(): void {
    // Selecciona todos los divs de cartas jugadas por su clase o un patrón de ID/clase
    this.playedCardsContainer.find('.card-played').remove();
     // Resetear z-index si se usó
     // $('.game-deck').find('[class^="card-"]').css('z-index', ''); // Ejemplo
  }

  /** Muestra una carta jugada en la mesa */
  displayPlayedCard(jugador: Jugador, carta: Naipe, manoNumero: number, jugadaEnMano: number): void {
      const playerIndex = jugador.esHumano ? 1 : 2;
      // Crear un ID único para esta carta jugada en esta posición
      // Ejemplo: card-p1-m0-j0 (Jugador 1, Mano 0, Jugada 0)
      const cardId = `card-p${playerIndex}-m${manoNumero}-j${jugadaEnMano}`;

      // Crear el elemento imagen para la carta jugada
      const img = $('<img>')
          .attr('id', cardId)
          .attr('src', carta.getImageSrc(this.imageBasePath))
          .addClass('card-played') // Clase para identificar cartas en la mesa
          .attr('alt', carta.getNombre())
          .css({ // Posicionar inicialmente fuera o donde corresponda
              position: 'absolute', // Necesario para animar/posicionar
              opacity: 0 // Empezar invisible para fade in
          });

       this.playedCardsContainer.append(img);

       // Calcular posición final en la mesa (esto depende de tu CSS/layout)
       // Estos son valores de ejemplo, necesitas ajustarlos
       const cardWidth = 70;
       const cardHeight = 100;
       const spacingX = 80;
       const spacingY = 110;
       const mesaOffsetX = 50;
       const mesaOffsetY = 50;

       const targetLeft = mesaOffsetX + manoNumero * spacingX + (playerIndex === 2 ? cardWidth / 3 : 0); // IA ligeramente desplazada?
       const targetTop = mesaOffsetY + jugadaEnMano * spacingY; // ¿O por jugador? Ajustar layout

       // Animar la carta a su posición final
       img.css({ left: targetLeft, top: targetTop }).animate({ opacity: 1 }, 300); // Fade in simple

       // Nota: La animación compleja de traslación del original es más difícil
       // con elementos <img> creados dinámicamente. Se puede hacer, pero requiere
       // calcular la posición inicial (mano del jugador) y usar .animate() con left/top.
       // Por simplicidad, aquí solo la posicionamos y hacemos fade in.
  }

  /** Muestra un mensaje temporal ("canto") sobre el área del jugador */
  showPlayerCall(jugador: Jugador, mensaje: string): void {
      const voiceElement = jugador.esHumano ? this.player1Voice : this.player2Voice;
      voiceElement.text(mensaje).addClass('recien-cantado').attr('data-mensaje', mensaje);

      setTimeout(() => {
          // Solo limpiar si el mensaje no cambió mientras tanto
          if (voiceElement.attr('data-mensaje') === mensaje) {
              voiceElement.text('').removeClass('recien-cantado').removeAttr('data-mensaje');
          }
      }, 1500); // Duración del mensaje
  }

  /** Establece el estado (habilitado/visible) de los botones de acción */
  setButtonState(buttonSelector: string, enabled: boolean, visible: boolean): void {
      const button = $(buttonSelector);
      if (visible) {
          button.show();
          if (enabled) {
              button.prop('disabled', false).removeClass('disabled'); // Asume clase 'disabled'
          } else {
              button.prop('disabled', true).addClass('disabled');
          }
      } else {
          button.hide();
      }
  }

  hideAllActionButtons(): void {
      $('.boton-accion').hide(); // Asume que todos los botones de juego tienen esta clase
  }

   /** Resalta la carta ganadora de una mano */
   highlightWinningCard(ganador: Jugador, manoNumero: number, jugadaEnManoGanadora: number): void {
        const playerIndex = ganador.esHumano ? 1 : 2;
        const cardId = `#card-p${playerIndex}-m${manoNumero}-j${jugadaEnManoGanadora}`;
        $(cardId).addClass('winning-card'); // Añadir clase para CSS (ej. borde brillante)
        // Quitar highlight después de un tiempo
        setTimeout(() => $(cardId).removeClass('winning-card'), 1500);
   }

   displayRoundWinner(winnerName: string): void {
       this.displayLog(`---> Gana la ronda: ${winnerName} <---`);
       // Podrías mostrar un overlay o mensaje más prominente aquí
   }

   displayFinalScore(score1: number, score2: number, name1: string, name2: string): void {
        this.displayLog("===================================");
        this.displayLog(`PARTIDA FINALIZADA`);
        this.displayLog(`Resultado: ${name1} ${score1} - ${name2} ${score2}`);
        this.displayLog(score1 > score2 ? `¡Ganador: ${name1}!` : (score2 > score1 ? `¡Ganador: ${name2}!` : "¡Empate!"));
        this.displayLog("===================================");
        // Deshabilitar acciones del juego
        this.hideAllActionButtons();
        this.playerCards1Container.empty(); // Limpiar manos
        this.playerCards2Container.empty();
   }


  // --- Métodos para Vincular Eventos del DOM a la Lógica del Juego ---

  bindPlayerActions(callbacks: {
    onPlayCard: (index: number) => void;
    onCantoEnvido: (canto: Canto) => void;
    onCantoTruco: (canto: Canto) => void;
    onResponseQuiero: () => void;
    onResponseNoQuiero: () => void;
    onIrAlMazo: () => void;
  }): void {
    // Click en carta humana
    this.playerCards1Container.on('click', '.naipe-humano', (event) => {
      event.preventDefault();
      const index = parseInt($(event.currentTarget).attr('data-naipe-index') || '-1', 10);
      if (index !== -1) {
        callbacks.onPlayCard(index);
      }
    });

    // Clicks en botones de canto Envido (usar data attributes)
    $('.canto-envido-btn').on('click', function(event) {
        event.preventDefault();
        const canto = $(this).data('canto') as Canto; // Ej: data-canto="E"
        if (canto) callbacks.onCantoEnvido(canto);
    });
     // Clicks en botones de canto Truco (usar data attributes)
    $('.canto-truco-btn').on('click', function(event) {
        event.preventDefault();
        const canto = $(this).data('canto') as Canto; // Ej: data-canto="T"
        if (canto) callbacks.onCantoTruco(canto);
    });

    // Click en Quiero / No Quiero
    $('#Quiero').on('click', (event) => { event.preventDefault(); callbacks.onResponseQuiero(); });
    $('#NoQuiero').on('click', (event) => { event.preventDefault(); callbacks.onResponseNoQuiero(); });

    // Click en Ir al Mazo
    $('#IrAlMazo').on('click', (event) => { event.preventDefault(); callbacks.onIrAlMazo(); });
  }

  bindSetupControls(callbacks: {
      onNameChange: (newName: string) => void;
      onDebugToggle: (enabled: boolean) => void;
      onLimitePuntosChange: (limite: number) => void;
  }): void {
      // Edición de nombre (ejemplo simplificado)
      const nameInput = $('#player-one .player-name'); // Asumimos editable
      nameInput.on('blur', () => {
          callbacks.onNameChange(nameInput.text());
          // Sincronizar con tabla de puntaje
          this.name1Element.text(nameInput.text());
      });
      nameInput.on('keydown', (e) => { if (e.key === 'Enter') nameInput.trigger('blur'); });


      // Debug checkbox
      $('#cbxDebug').on('change', function() {
          callbacks.onDebugToggle($(this).is(':checked'));
      }).prop('checked', false); // Estado inicial

      // Límite de puntos
      $('.rbd-ptos-partida').on('change', function() {
           if ($(this).is(':checked')) {
                callbacks.onLimitePuntosChange(parseInt($(this).val() as string, 10));
           }
      });

      // Cajas colapsables (lógica original UI)
        const _cajasCollapsables = $('.box--collapsable');
        if (_cajasCollapsables.length > 0) {
            _cajasCollapsables.find('.box-content').addClass('box-content--hidden');
            _cajasCollapsables.find('.box-title').addClass('box-title--hidden').on('click', function() {
                const _title = $(this);
                const _content = _title.parent().children('.box-content');
                if (_title.hasClass('box-title--hidden')) {
                    _title.removeClass('box-title--hidden'); //.children('img').addClass('title-rotate');
                    _content.removeClass('box-content--hidden');
                } else {
                    _title.addClass('box-title--hidden'); //.children('img').removeClass('title-rotate');
                    _content.addClass('box-content--hidden');
                }
            });
        }
  }
}