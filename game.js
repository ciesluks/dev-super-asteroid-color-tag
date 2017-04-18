
    // 1. Wait for the onload even
    window.addEventListener("load",function() {

	var Q = window.Q = Quintus()
			.include("Sprites, Scenes, Input, 2D, Touch, UI")
			.setup({ maximize: true }).touch();

	var KEY_NAMES = { LEFT: 37, RIGHT: 39, SPACE: 32,
				UP: 38, A: 65, D: 68, W: 87, Q: 81};

	Q.input.keyboardControls({
		37: "player1Left",
		39: "player1Right",
		38: "player1Up",
		32: "player1Fire",
		68: "player2Right",
		65: "player2Left",
		87: "player2Up",
		81: "player2Fire"
	});

	Q.gravityX = 0;
	Q.gravityY = 0;

	Q.SPRITE_SHIP = 1;
	Q.SPRITE_BULLET = 2;
	Q.SPRITE_ASTEROID = 4;

	Q.component("reposition", {

	  added: function() {

		this.entity.on("step",this,"step");
	  },

	  step: function(dt) {
		var p = this.entity.p;
		var maxSide = Math.sqrt(p.h * p.h  + p.w + p.w);
		if(p.x > Q.width + maxSide) { p.x -= Q.width + maxSide }
		if(p.x < -maxSide) { p.x += Q.width + maxSide }

		if(p.y > Q.height + maxSide) { p.y -= Q.height + maxSide }
		if(p.y < -maxSide) { p.y += Q.height + maxSide }
	  }

	});

	Q.Sprite.extend("VectorSprite",{

	  draw: function(ctx) {
		var p = this.p;
		ctx.fillStyle = p.color;

		ctx.beginPath();
		ctx.moveTo(p.points[0][0], p.points[0][1]);
		for(var i =1, max = p.points.length;i<max;i++) {
		  ctx.lineTo(p.points[i][0], p.points[i][1]);
		}
		ctx.fill();
	  }
	});

	Q.VectorSprite.extend("Ship", {
	  init: function(p) {
		this._super(p, {
		  type: Q.SPRITE_NONE,
		  collisionMask: Q.SPRITE_ASTEROID,
		  w: 10,
		  h: 20,
		  x: p.startX,
		  y: p.startY,
		  omega: 0,
		  omegaDelta: 700,
		  maxOmega: 400,
		  acceleration: 8,
		  points: [ [0, -10 ], [ 10, 18 ], [ -10, 18 ]],
		  bulletSpeed: 500,
		  activated: false,
		  steps: 0
		});
		this.add("2d, reposition");

		Q.input.on(p.fire,this,"fire");

		this.activationObject = new Q.Sprite({ x: p.startX, y: p.startY, w: 100, h: 100 });
	  },

	  fire: function() {
	  if (this.p.activated) {
		var p = this.p;
		var dx =  Math.sin(p.angle * Math.PI / 180),
			dy = -Math.cos(p.angle * Math.PI / 180);
		this.stage.insert(
		  new Q.Bullet({ x: this.c.points[0][0], 
						 y: this.c.points[0][1],
						 vx: dx * p.bulletSpeed,
						 vy: dy * p.bulletSpeed,
						 color: p.color
				  })
		);
	  }
	  },

	  checkActivation: function() {
		if(!this.stage.search(this.activationObject, Q.SPRITE_ASTEROID)) {
		  this.p.activated = true;
		}
	  },

	  step: function(dt) {
		if(!this.p.activated) {
		  return this.checkActivation();
		}
		
		this.p.steps++;
		if(this.p.steps >= 15) {
			this.fire();
			this.p.steps = 0;
		}

		var p = this.p;
		p.angle += p.omega * dt;
		p.omega *=  1 - 1 * dt;

		if(Q.inputs[p.right]) { 
		  p.omega += p.omegaDelta * dt;
		  if(p.omega > p.maxOmega) { p.omega = p.maxOmega; }
		} else if(Q.inputs[p.left]) {
		  p.omega -= p.omegaDelta * dt;
		  if(p.omega < -p.maxOmega) { p.omega = -p.maxOmega; }
		}

		if(p.angle > 360) { p.angle -= 360; }
		if(p.angle < 0) { p.angle += 360; }

		if(Q.inputs[p.up]) {
		  var thrustX = Math.sin(p.angle * Math.PI / 180),
			  thrustY = -Math.cos(p.angle * Math.PI / 180);

		  p.vx += thrustX * p.acceleration;
		  p.vy += thrustY * p.acceleration;
		}

	  },

	  draw: function(ctx) {
		if(this.p.activated) { this._super(ctx); }
	  },

	  reset: function() {
		Q._extend(this.p,{ 
		  x: this.p.startX,
		  y: this.p.startY,
		  vx: 0,
		  vy: 0,
		  angle: 0,
		  omega: 0,
		  activated: false
		});

	  }
	});

	Q.Sprite.extend("Bullet",{
	  init: function(p) {

		this._super(p,{ 
		  w:3,
		  h:3,
		  type: Q.SPRITE_BULLET,
		  collisionMask: Q.SPRITE_ASTEROID
		});

		this.add("2d");
		this.on("hit.sprite",this,"collision");
	  },

	  collision: function(col) {
		var objP = col.obj.p;
		var score;
		if(objP.size > 30) { 
			this.stage.insert(new Q.Asteroid({ 
				x: objP.x,
				y: objP.y,
				size: objP.size * 2 / 3,
				startAngle: objP.startAngle + 90,
				color: this.p.color
			}));
			this.stage.insert(new Q.Asteroid({ 
				x: objP.x,
				y: objP.y,
				size: objP.size * 2 / 3,
				startAngle: objP.startAngle - 90,
				color: this.p.color
			}));
			col.obj.destroy();
			
			if(this.p.color === "#ff9999") {
				score = Q.state.get("playerOnePercentage") + 2;
				Q.state.set("playerOnePercentage", score);
			}
			else {
				score = Q.state.get("playerTwoPercentage") + 2;
				Q.state.set("playerTwoPercentage", score);
			}

			if(objP.color === "#ff9999") {
				score = Q.state.get("playerOnePercentage") - 1;
				Q.state.set("playerOnePercentage", score);
			}
			else if(objP.color === "#66ffff") {
				score = Q.state.get("playerTwoPercentage") - 1;
				Q.state.set("playerTwoPercentage", score);
			}
		}
		else {
			if(objP.color !== this.p.color) {
				if(this.p.color === "#ff9999") {
					score = Q.state.get("playerOnePercentage") + 1;
					Q.state.set("playerOnePercentage", score);
					score = Q.state.get("playerTwoPercentage") - 1;
					Q.state.set("playerTwoPercentage", score);
				}
				else {
					score = Q.state.get("playerTwoPercentage") + 1;
					Q.state.set("playerTwoPercentage", score);
					score = Q.state.get("playerOnePercentage") - 1;
					Q.state.set("playerOnePercentage", score);
				}

				objP.color = this.p.color;
			}
		}
		this.destroy();
	  },

	  draw: function(ctx) {
		ctx.fillStyle = this.p.color;
		ctx.fillRect(-this.p.cx,-this.p.cy,this.p.w,this.p.h);
	  },

	  step: function(dt) {
		if(!Q.overlap(this,this.stage)) {
		  this.destroy();
		}
	  }
	});

	Q.VectorSprite.extend("Asteroid", {

	  init: function(p) {
		p = this.createShape(p);

		if(!p.vx) {
		  p.startAngle = p.startAngle || Math.random()*360;
		  var speed = Math.random()*100 + 50;
		  p.vx = Math.cos(p.startAngle)*speed;
		  p.vy = Math.sin(p.startAngle)*speed;
		}

		this._super(p, {
		  type: Q.SPRITE_ASTEROID,
		  collisionMask: Q.SPRITE_SHIP,
		  omega: Math.random() * 100,
		  skipCollide: true,
		  color: "#FFF"
		});
		this.add("2d, reposition");

		this.on("hit.sprite",this,"collision");
	  },

	  collision: function(col) {
		if(col.obj.isA("Ship")) {
		  col.obj.reset(); 
		}
	  },

	  step: function(dt) {
		this.p.angle += this.p.omega * dt;
	  },

	  createShape: function(p) {
		var angle = Math.random()*2*Math.PI,
			numPoints = 7 + Math.floor(Math.random()*5),
			minX = 0, maxX = 0,
			minY = 0, maxY = 0,
			curX, curY;

		p = p || {};

		p.points = [];

		var startAmount = p.size;

		for(var i = 0;i < numPoints;i++) {
		  curX = Math.floor(Math.cos(angle)*startAmount);
		  curY = Math.floor(Math.sin(angle)*startAmount);

		  if(curX < minX) minX = curX;
		  if(curX > maxX) maxX = curX;

		  if(curY < minY) minY = curY;
		  if(curY > maxY) maxY = curY;

		  p.points.push([curX,curY]);

		  startAmount += Math.floor(Math.random()*3);
		  angle += (Math.PI * 2) / (numPoints+1);
		};

		maxX += 30;
		minX -= 30;
		maxY += 30;
		minY -= 30;

		p.w = maxX - minX;
		p.h = maxY - minY;

		for(var i = 0;i < numPoints;i++) {
		  p.points[i][0] -= minX + p.w/2;
		  p.points[i][1] -= minY + p.h/2;
		}


		p.x = p.x || Math.random()*Q.width;
		p.y = p.y || Math.random()*Q.height;
		p.cx = p.w/2;
		p.cy = p.h/2;
		p.angle = angle;
	   return p;
	 }
	});

	Q.UI.Text.extend("Score",{ 
		init: function(p) {
			this._super({
			  label: "P1: 0% P2: 0%",
			  x: 0,
			  y: 0
			});

			Q.state.on("change.playerOnePercentage",this,"score");
			Q.state.on("change.playerTwoPercentage",this,"score");
		},

		score: function() {
			console.log(Q("Asteroid").length);
			var p1 = Q.state.get("playerOnePercentage") / Q("Asteroid").length;
			var p2 = Q.state.get("playerTwoPercentage") / Q("Asteroid").length;
			this.p.label = "P1: " + p1.toFixed(2)*100 + "% P2: " + p2.toFixed(2)*100 + "%";
		}
	});

	Q.scene("level1",function(stage) {
	  Q.state.reset({ playerOnePercentage: 0, playerTwoPercentage: 0 });	
	
	  var player = stage.insert(new Q.Ship({ startX: Q.width/4, startY: Q.height/2, 
		  left: "player1Left", right: "player1Right", up: "player1Up", fire: "player1Fire",
		  color: "#ff9999"}));
	  var player2 = stage.insert(new Q.Ship({ startX: Q.width*(3/4), startY: Q.height/2,
		  left: "player2Left", right: "player2Right", up: "player2Up", fire: "player2Fire",
		  color: "#66ffff"}));
	  
	  stage.insert(new Q.Asteroid({ size: 60 }));
	  stage.insert(new Q.Asteroid({ size: 60 }));
	  stage.insert(new Q.Asteroid({ size: 60 }));
	  stage.insert(new Q.Asteroid({ size: 60 }));
	  stage.insert(new Q.Asteroid({ size: 60 }));
	  stage.insert(new Q.Asteroid({ size: 60 }));
	  
	  var scoreContainer = stage.insert(new Q.UI.Container({
		x: Q.width/2, y: Q.height/10, fill: "rgba(255,255,255,0.5)"
		}));
	  var scoreLabel = scoreContainer.insert(new Q.Score({x:10, y: 10}));
	  scoreContainer.fit(10,200);

	  stage.on("step",function() {
		if(Q("Asteroid").length == 0 && !Q.stage(1)) { 
		  Q.stageScene("endGame",1, { label: "You Win!" }); 
		}
	  });
	});

	Q.scene('endGame',function(stage) {
	  var container = stage.insert(new Q.UI.Container({
		x: Q.width/2, y: Q.height/2, fill: "rgba(255,255,255,0.5)"
		}));

		var button = container.insert(new Q.UI.Button({ x: 0, y: 0, fill: "#CCCCCC",
													   label: "Play Again" }))         
		var label = container.insert(new Q.UI.Text({x:10, y: -10 - button.p.h, 
									 label: stage.options.label }));
		// When the button is clicked, clear all the stages
		// and restart the game.
		button.on("click",function() {
		  Q.clearStages();
		  Q.stageScene('level1');
		});

		// Expand the container to visibily fit it's contents
		container.fit(20);
	  });

	Q.stageScene("level1");

  });