import { SignalManager } from "./lib/signal-manager";
import { standardEasing, TransitionManager } from "./lib/transition-manager";

() => {
	const WIDTH = 7;
	const HEIGHT = 12;

	const BUBBLE_SIZE = 0.2;
	const BUBBLE_OFFSET_X = -0.6;
	const BUBBLE_OFFSET_Y = -0.875;

	const SCORE_MAX_LENGTH = 7;
	const SCORE_HEIGHT = 0.2;
	const SCORE_OFFSET_Y = -1.185;
	const SCORE_OFFSET_Z = 0.105;

	const TRANSITION_TIME = 100; // ms
	const TRANSITION_INTERPOLATION = standardEasing;

	const ENTITY_HOST_TYPE: Entities.EntityHostType =
		Script.context == "entity_server" ? "domain" : "local";

	const COLORS = [
		"f44336", // red
		"ff9800", // orange
		"ffeb3b", // yellow
		"8bc34a", // green
		"03a9f4", // lightblue
		"3f51b5", // indigo
		"9c27b0", // purple
	];

	const POP_SOUND = SoundCache.getSound(
		Script.resolvePath("./assets/pop.wav"),
	);

	const DING_SOUND = SoundCache.getSound(
		Script.resolvePath("./assets/ding.wav"),
	);

	const hexToRgb = (hex: string) => ({
		r: parseInt(hex.slice(0, 2), 16),
		g: parseInt(hex.slice(2, 4), 16),
		b: parseInt(hex.slice(4, 6), 16),
	});

	const getRandomColorKey = () =>
		COLORS[Math.floor(Math.random() * COLORS.length)];

	const objectValues = (object: object) =>
		Object.keys(object).map(key => object[key]);

	class Bubble {
		transitions = new TransitionManager();

		popped = false;
		color: string;

		entityId: Uuid;

		constructor(
			private readonly bubblePopper: BubblePopper,
			public x: number,
			public y: number,
			dontTransitionIn = false,
		) {
			this.color = getRandomColorKey();

			this.entityId = Entities.addEntity<Entities.EntityPropertiesSphere>(
				{
					type: "Sphere",
					parentID: this.bubblePopper.entityId,
					dimensions: {
						x: dontTransitionIn ? BUBBLE_SIZE : 0,
						y: dontTransitionIn ? BUBBLE_SIZE : 0,
						z: dontTransitionIn ? BUBBLE_SIZE : 0,
					},
					localPosition: {
						x: x * BUBBLE_SIZE + BUBBLE_OFFSET_X,
						y: y * BUBBLE_SIZE + BUBBLE_OFFSET_Y,
						z: 0,
					},
					color: hexToRgb(this.color),
					collisionless: false,
					grab: { grabbable: false, triggerable: true },
					script: Script.resolvePath(
						(ENTITY_HOST_TYPE == "local"
							? "./bubble-local.client.js?"
							: "./bubble.client.js?") + Date.now(),
					),
				},
				ENTITY_HOST_TYPE,
			);

			if (!dontTransitionIn) {
				this.transitions.startTransition({
					from: 0,
					to: BUBBLE_SIZE,
					time: TRANSITION_TIME,
					interpolationFn: TRANSITION_INTERPOLATION,
					transitionFn: size => {
						Entities.editEntity<Entities.EntityPropertiesSphere>(
							this.entityId,
							{
								dimensions: {
									x: size,
									y: size,
									z: size,
								},
							},
						);
					},
				});
			}
		}

		draw() {
			const localPosition = Entities.getEntityProperties<
				Entities.EntityPropertiesSphere
			>(this.entityId).localPosition;

			const newY = this.y * BUBBLE_SIZE + BUBBLE_OFFSET_Y;

			// only update if necessary
			if (Math.abs(localPosition.y - newY) > BUBBLE_SIZE / 2) {
				this.transitions.startTransition({
					from: localPosition.y,
					to: newY,
					time: TRANSITION_TIME,
					interpolationFn: TRANSITION_INTERPOLATION,
					transitionFn: y => {
						Entities.editEntity<Entities.EntityPropertiesSphere>(
							this.entityId,
							{
								localPosition: {
									x: localPosition.x,
									y,
									z: localPosition.z,
								},
							},
						);
					},
				});
			}
		}

		pop(dontTransition = false) {
			this.popped = true;

			const time = dontTransition ? 0 : TRANSITION_TIME;

			this.transitions.startTransition({
				from: BUBBLE_SIZE,
				to: 0,
				time,
				interpolationFn: TRANSITION_INTERPOLATION,
				transitionFn: size => {
					Entities.editEntity<Entities.EntityPropertiesSphere>(
						this.entityId,
						{
							dimensions: {
								x: size,
								y: size,
								z: size,
							},
						},
					);
				},
			});

			Script.setTimeout(() => {
				Entities.deleteEntity(this.entityId);
				this.transitions.cleanup();
			}, time);
		}
	}

	class BubblePopper implements ClientEntityScript {
		signals = new SignalManager();

		bubbles: Bubble[][];

		popped = 0;

		entityId: Uuid;
		scoreTextId: Uuid;

		createBubbles() {
			this.bubbles = Array.apply(null, Array(WIDTH)).map((_, x) =>
				Array.apply(null, Array(HEIGHT)).map((_, y) => {
					return new Bubble(this, x, y, true);
				}),
			);
		}

		findSameBubblesAround(bubble: Bubble, lastSameBubblesHashed = {}) {
			const x = bubble.x;
			const y = bubble.y;
			const bubs = [bubble];

			// left, right, top, bottom
			if (x > 0) bubs.push(this.bubbles[x - 1][y]);
			if (x < WIDTH - 1) bubs.push(this.bubbles[x + 1][y]);
			if (y > 0) bubs.push(this.bubbles[x][y - 1]);
			if (y < HEIGHT - 1) bubs.push(this.bubbles[x][y + 1]);

			let sameBubblesHashed = {
				...lastSameBubblesHashed,
				...bubs
					.filter(b => b.color == bubble.color)
					.reduce((obj, b) => {
						obj[b.x + "," + b.y] = b;
						return obj;
					}, {}),
			};

			for (const hash of Object.keys(sameBubblesHashed)) {
				if (lastSameBubblesHashed[hash] == null) {
					sameBubblesHashed = this.findSameBubblesAround(
						sameBubblesHashed[hash],
						sameBubblesHashed,
					);
				}
			}

			return sameBubblesHashed;
		}

		moveBubblesDown() {
			for (let x = 0; x < this.bubbles.length; x++) {
				// remove popped
				this.bubbles[x] = this.bubbles[x].filter(
					bubble => !bubble.popped,
				);

				// fill empty
				if (this.bubbles[x].length != HEIGHT) {
					const leftToAdd = HEIGHT - this.bubbles[x].length;
					for (let i = 0; i < leftToAdd; i++) {
						this.bubbles[x].push(
							// new Bubble(this, x, leftToAdd - i),
							new Bubble(this, x, this.bubbles[x].length),
						);
					}
				}

				// redraw
				for (let y = 0; y < this.bubbles[x].length; y++) {
					const bubble = this.bubbles[x][y];

					if (bubble.y != y) {
						bubble.y = y;
						bubble.draw();
					}
				}
			}
		}

		isGameOver() {
			for (let x = 0; x < this.bubbles.length; x++) {
				for (let y = 0; y < this.bubbles[x].length; y++) {
					if (
						Object.keys(
							this.findSameBubblesAround(this.bubbles[x][y]),
						).length > 1
					) {
						return false;
					}
				}
			}
			return true;
		}

		updateScore() {
			const poppedStr = String(this.popped);

			const text =
				Array.apply(
					null,
					Array(
						Math.min(
							SCORE_MAX_LENGTH - poppedStr.length,
							SCORE_MAX_LENGTH,
						),
					),
				)
					.map(() => "0")
					.join("") + poppedStr;

			Entities.editEntity<Entities.EntityPropertiesText>(
				this.scoreTextId,
				{
					text,
					dimensions: {
						// x:
						// 	Entities.textSize(this.scoreTextId, text).width +
						// 	0.01,
						x: 0.7,
						y: SCORE_HEIGHT,
					},
				},
			);
		}

		gameOver() {
			// play sound!
			const position = Entities.getEntityProperties<
				Entities.EntityPropertiesSphere
			>(this.entityId).position;

			if (DING_SOUND.downloaded) {
				Audio.playSound(DING_SOUND, {
					volume: 0.1,
					position,
					localOnly: ENTITY_HOST_TYPE == "local",
				});
			}

			// pop and recreate
			for (const column of this.bubbles) {
				for (const bubble of column) {
					Entities.editEntity<Entities.EntityPropertiesSphere>(
						bubble.entityId,
						{
							name: "Bubble",
							parentID: "",
							dynamic: true,
							gravity: {
								x: 0,
								y: -9.8,
								z: 0,
							},
							velocity: {
								x: Math.random() - 0.5,
								y: -1,
								z: Math.random() - 0.5,
							},
							lifetime: 3,
						},
					);
				}
			}

			Script.setTimeout(() => {
				this.createBubbles();
				// reset score
				this.popped = 0;
				this.updateScore();
			}, 1000 * 2);
		}

		onClick(bubble: Bubble) {
			const sameBubbles = objectValues(
				this.findSameBubblesAround(bubble),
			);

			if (sameBubbles.length <= 1) {
				if (this.isGameOver()) this.gameOver();
				return;
			}

			for (const b of sameBubbles) {
				b.pop();
				this.popped++;
			}

			const bubblePosition = Entities.getEntityProperties<
				Entities.EntityPropertiesSphere
			>(bubble.entityId).position;

			if (POP_SOUND.downloaded) {
				Audio.playSound(POP_SOUND, {
					volume: 0.1,
					position: bubblePosition,
					localOnly: ENTITY_HOST_TYPE == "local",
				});
			}

			this.moveBubblesDown();
			this.updateScore();
		}

		preCleanup() {
			// delete all parented to this entity
			Entities.findEntities(
				Entities.getEntityProperties<Entities.EntityPropertiesModel>(
					this.entityId,
				).position,
				4,
			).forEach(entityId => {
				const parentId = Entities.getEntityProperties<
					Entities.EntityPropertiesModel
				>(entityId).parentID;
				if (parentId == this.entityId) {
					Entities.deleteEntity(entityId);
				}
			});
		}

		createScore() {
			this.scoreTextId = Entities.addEntity<
				Entities.EntityPropertiesText
			>(
				{
					type: "Text",
					font: "Roboto",
					parentID: this.entityId,
					lineHeight: SCORE_HEIGHT,
					unlit: true,
					localPosition: {
						x: 0,
						y: SCORE_OFFSET_Y,
						z: SCORE_OFFSET_Z,
					},
					// rotation: Quat.fromPitchYawRollDegrees(0, 180, 0),
					backgroundAlpha: 0,
					grab: { grabbable: false },
				},
				ENTITY_HOST_TYPE,
			);

			Script.setTimeout(() => {
				this.updateScore();
			}, 100);
		}

		listenToClicks() {
			Messages.subscribe(this.entityId);
			this.signals.connect(
				Messages.messageReceived,
				(channel, message, senderId, localOnly) => {
					if (channel != this.entityId) return;
					if (ENTITY_HOST_TYPE == "local" && !localOnly) return;

					for (const column of this.bubbles) {
						for (const bubble of column) {
							if (bubble.entityId == message) {
								this.onClick(bubble);
								return;
							}
						}
					}
				},
			);
		}

		preload(entityId: Uuid) {
			this.entityId = entityId;
			this.preCleanup();

			this.createBubbles();
			this.createScore();

			this.listenToClicks();
		}

		unload() {
			this.signals.cleanup();

			Messages.unsubscribe(this.entityId);
			Entities.deleteEntity(this.scoreTextId);

			for (const column of this.bubbles) {
				for (const bubble of column) {
					bubble.pop(true);
				}
			}
		}
	}

	return new BubblePopper();
};
