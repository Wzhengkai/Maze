
var gl;
var program;

var blockArray=[];   //墙坐标数组
var bbuffer;
var roadArray=[];   //通路坐标数组
var rbuffer;
var indexArray=[];   //纹理坐标
var ibuffer;
var startArray=[];  //起点数组
var sbuffer;
var endArray=[];   //终点数组
var ebuffer;
var circleArray=[];   //当前位置球体数组
var cbuffer;
var pathArray=[];     //走过的路
var pbuffer;
var size=6;    //迷宫尺寸
var rnArray=[];    //路的法线向量
var bnArray=[];    //墙的法线向量
var rnbuffer,bnbuffer;
var shadowArray=[];   //阴影数组
var shadowBuffer;
var uselessArray=[];  //仅占位用
var uselessBuffer;
var boxshadowArray=[];   //墙上阴影数组
var boxshadowBuffer;
var bsindexArray=[];    //墙上阴影纹理坐标
var bsindexBuffer;
var normals=[
	vec3(0,0,1),
	vec3(1,0,0),
	vec3(0,0,-1),
	vec3(-1,0,0),
	vec3(0,-1,0),
	vec3(0,1,0)
];

//球体水平分割块数
var h_c=10;
//球体垂直分割块数
var v_c=10;
//转弧度
//相邻两纬线的夹角
var h_r=radians(180.0/h_c);
//相邻两经线的夹角
var v_r=radians(360.0/v_c);

var textureFloor;
var textureWall;

var modeViewMatrix, projectionMatrix;
var modelViewMatrixLoc, projectionMatrixLoc;

var vpLoc;    //顶点着色器中的vPosition，表示顶点位置
var inuvLoc;  //顶点着色器中的inUV，表示纹理坐标
var textureLoc;  //片元着色器中的texture
var typeLoc;   //片元着色器中的type，表示绘制类型
var vnLoc;     //顶点着色器中的vNormal，表示法线向量

var texCoord=[       //四边形纹理坐标
	vec2(0,0),
	vec2(1,0),
	vec2(1,1),
	vec2(0,1)
];

var near = 0.001;
var far =150;
var radius = 3;
var theta  = 0.0;
var phi    = 0.0;
var dr = 5.0 * Math.PI/180.0;

var eye=vec3(0,0,0);
var at = vec3(10, 0.0, 0.5);
var up = vec3(0, 0, 10);

var  fovy = 45.0;  // Field-of-view in Y direction angle (in degrees)
var  aspect;       // Viewport aspect ratio

var speed=0.1;   //行进速度
var LEFT = 65;   //键码
var UP = 87;
var RIGHT = 68;
var DOWN = 83;
var CHEAT = 67;
var KEYS = {};
var lastX=-1;   //保存开启上帝视角之前的坐标
var lastY=-1;
var sensitivity=800;  //镜头移动速度，越大越慢

var isCheat=false;   //是否开启上帝视角的标志值
var lastEye=vec3(0,0,0);   //保存开启上帝视角之前的摄像机参数
var lastAt = vec3(10, 0.0, 0.5);
var lastUp = vec3(0, 0, 10);

var data=[];    //迷宫数据

var lightPosition = vec4(150, 150, 300, 0.0 );
var lightAmbient = vec4(0.7, 0.7, 0.7, 1.0 );
var lightDiffuse = vec4( 0.8, 0.8, 0.8, 1.0 );
var lightSpecular = vec4( 0.5, 0.5, 0.5, 1.0 );

//var materialAmbient = vec4( 0.7, 0.7, 0.7, 1.0 );
//var materialDiffuse = vec4( 1.0, 0.8, 0.0, 1.0);
//var materialSpecular = vec4( 1.0, 0.8, 0.0, 1.0 );
var materialShininess = 10.0;
window.onload = function init()
{
    var canvas = document.getElementById( "gl-canvas" );
    aspect =  canvas.width/canvas.height;
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    gl.viewport( 0, 0, canvas.width, canvas.height );
    
    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );
	//同时开启深度缓存和混合模式
	gl.enable(gl.DEPTH_TEST);   
    gl.enable(gl.BLEND);  
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
	
    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );
	
	canvas.addEventListener("mousemove",function(e){ 
		var x = e.clientX;
		var y = e.clientY;
		lastX=lastX==-1?x:lastX;
		lastY=lastY==-1?y:lastY;
		var radius=Math.PI*(lastX-x)/sensitivity;
		var a=eye[0],b=eye[1],x0=at[0],y0=at[1];
		at[0]=a+(x0-a)*Math.cos(radius)-(y0-b)*Math.sin(radius);
		at[1]=b+(x0-a)*Math.sin(radius)+(y0-b)*Math.cos(radius);
		at[2]=at[2]+(lastY-y)*10/sensitivity;
		lastX=x;
		lastY=y;  
	},false);
	
	canvas.addEventListener("mouseout",function(e){ 
		lastX=-1;
		lastY=-1;  
	},false);
	
	document.onkeydown = function(e) {
		if(e.keyCode==CHEAT){
			cheat();
		}else{
			KEYS[e.keyCode] = true;
		}
    };
    document.onkeyup = function(e) {
        KEYS[e.keyCode] = false;
    };
	
	setInterval(function() {
        doLogic();
    }, 16);

	//ambientProduct = mult(lightAmbient, materialAmbient);
    //diffuseProduct = mult(lightDiffuse, materialDiffuse);
    //specularProduct = mult(lightSpecular, materialSpecular);
	
	gl.uniform4fv(gl.getUniformLocation(program, "lightAmbient"),
       flatten(lightAmbient));
    gl.uniform4fv(gl.getUniformLocation(program, "lightDiffuse"),
       flatten(lightDiffuse) );
    gl.uniform4fv(gl.getUniformLocation(program, "lightSpecular"), 
       flatten(lightSpecular) );	
    gl.uniform4fv(gl.getUniformLocation(program, "lightPosition"), 
       flatten(lightPosition) );
       
    gl.uniform1f(gl.getUniformLocation(program, 
       "shininess"),materialShininess);
    initData();
	render();
}

//生成球体坐标
//@param x,y,z:球心坐标
function generateCircle(x,y,z){
	//纬度线半径数组
	var rs=[];
	for(var i=1;i<h_c;++i){
		rs.push(0.1*Math.abs(Math.sin(h_r*i)));
	}
	//纬度线y坐标数组
	var ys=[];
	for(var i=1;i<h_c;++i){
		ys.push(0.1*Math.cos(h_r*i));
	}
	
	//纬线与经线交的点按照行顺序push
	for(var i=1;i<h_c;++i){
		var tmp=get_latitude(rs,ys,i);
		for(var j=0;j<tmp.length;++j){
			circleArray.push(tmp[j]);
		}
	}
	
	//纬线与经线交的点按照经线顺序push
	for(var i=0;i<v_c;++i){
		var tmp=get_longitude(rs,ys,i);
		for(var j=0;j<tmp.length;++j){
			circleArray.push(tmp[j]);
		}
	}
	
	translateXYZ(x,y,z);
}

//rs:纬度线半径数组,ys:纬度线y坐标数组,n:从上到下第n条纬线
function get_latitude(rs,ys,n){
	var arr=[];
	var r=rs[n-1];
	var y=ys[n-1];
	for(var i=0;i<v_c;++i){
		arr.push(Math.sin(i*v_r)*r,y,r*Math.cos(i*v_r));
	}
	return arr;
}

//rs:纬度线半径数组,ys:纬度线y坐标数组,n:从z轴正方向起第n条经线
function get_longitude(rs,ys,n){
	var arr=[];
	arr.push(0,0.1,0);
	for(var i=1;i<h_c;++i){
		arr.push(rs[i-1]*Math.sin(n*v_r),ys[i-1],rs[i-1]*Math.cos(n*v_r));
	}
	arr.push(0,-0.1,0);
	return arr;
}

//开启/关闭上帝视角
function cheat(){
	if(isCheat){
		eye=vec3(lastEye[0],lastEye[1],lastEye[2]);
		at=vec3(lastAt[0],lastAt[1],lastAt[2]);
		up=vec3(lastUp[0],lastUp[1],lastUp[2]);
		changeZ(0.001);
	}else{
		lastEye=vec3(eye[0],eye[1],eye[2]);
		lastAt=vec3(at[0],at[1],at[2]);
		lastUp=vec3(up[0],up[1],up[2]);
		changeZ(data.length/100);
		eye[2]=data.length;
	}
	isCheat=!isCheat;
}
//@param sez:起止标志z坐标
//马赫带消除
function changeZ(sez){
	for(var i=0;i<startArray.length;){
		startArray[i+2]=sez;
		endArray[i+2]=sez;
		i+=3;
	}
	gl.bindBuffer(gl.ARRAY_BUFFER, sbuffer);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(startArray), gl.STATIC_DRAW);
	
	gl.bindBuffer(gl.ARRAY_BUFFER, ebuffer);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(endArray), gl.STATIC_DRAW);
}
//按键交互以及碰撞检测
function doLogic(){
	if(KEYS[UP]){
		forword();
	}
    if(KEYS[DOWN]){
		backword();
	}
	if(KEYS[LEFT]){
		goLeft();
	}
    if(KEYS[RIGHT]){
		goRight();
	}
	var x=eye[0];
	var y=data.length-eye[1];
	if(!isCheat&&x>=data.length-1&&x<=data.length&&y>=data.length-2&&y<=data.length-1){
		alert("恭喜你，到达出口!");
		initData();
		render();
	}
}
//球体坐标平移x,y,z
function translateXYZ(x,y,z){
	for(var i=0;i<circleArray.length;){
		circleArray[i++]+=x;
		circleArray[i++]+=y;
		circleArray[i++]+=z;
	}
}
//摄像机前进
function forword(){
	var v = normalize( vec3(at[0]-eye[0],at[1]-eye[1],0) );
	v[0]*=speed;
	v[1]*=speed;
	
	if(!isCheat){
		var x=eye[0]+v[0];
		var y=data.length-(eye[1]+v[1]);
		if(!check(x,y)){
			eye=add(v,eye);
			at=add(v,at);
			translateXYZ(v[0],v[1],0);
			pathArray.push(eye[0]);
			pathArray.push(eye[1]);
			pathArray.push(0.3);
		}
	}else{
		eye=add(v,eye);
		at=add(v,at);
	}
}

//true:碰到墙了
//false:没碰到
function check(x,y){
	var flag=false;
	for(var i=0;i<data.length;++i){
		for(var j=0;j<data[i].length;++j){
			if(data[i][j].value==0){
				if(x>=j&&x<=j+1&&y>=i&&y<=i+1){
					flag=true;
					break;
				}
			}
		}
		if(flag)
			break;
	}
	return flag;
}
//摄像机后退
function backword(){
	var v = normalize( vec3(at[0]-eye[0],at[1]-eye[1],0) );
	v[0]*=speed;
	v[1]*=speed;
	if(!isCheat){
		var x=eye[0]-v[0];
		var y=data.length-(eye[1]-v[1]);
		if(!check(x,y)){
			eye=subtract(eye,v);
			at=subtract(at,v);
			translateXYZ(-v[0],-v[1],0);
			pathArray.push(eye[0]);
			pathArray.push(eye[1]);
			pathArray.push(0.3);
		}
	}else{
		eye=subtract(eye,v);
		at=subtract(at,v);
	}
}
//摄像机左移
function goLeft(){
	var v=normalize( vec3(eye[1]-at[1],at[0]-eye[0],0) );
	v[0]*=speed;
	v[1]*=speed;
	if(!isCheat){
		var x=eye[0]+v[0];
		var y=data.length-(eye[1]+v[1]);
		if(!check(x,y)){
			eye=add(v,eye);
			at=add(v,at);
			translateXYZ(v[0],v[1],0);
			pathArray.push(eye[0]);
			pathArray.push(eye[1]);
			pathArray.push(0.3);
		}
	}else{
		eye=add(v,eye);
		at=add(v,at);
	}
}
//摄像机右移
function goRight(){
	var v=normalize( vec3(eye[1]-at[1],at[0]-eye[0],0) );
	v[0]*=speed;
	v[1]*=speed;
	if(!isCheat){
		var x=eye[0]-v[0];
		var y=data.length-(eye[1]-v[1]);
		if(!check(x,y)){
			eye=subtract(eye,v);
			at=subtract(at,v);
			translateXYZ(-v[0],-v[1],0);
			pathArray.push(eye[0]);
			pathArray.push(eye[1]);
			pathArray.push(0.3);
		}
	}else{
		eye=subtract(eye,v);
		at=subtract(at,v);
	}
}
//迷宫重新生成,所有顶点数据重新生成
function initData(){
	data=genMaze(size, size, [1, 0], [size*2-1,size*2]);
	blockArray=[];   
	roadArray=[];  
	startArray=[];
	endArray=[];
	indexArray=[];
	circleArray=[];
	pathArray=[];
	KEYS={};
	rnArray=[];
	bnArray=[];
	shadowArray=[];
	boxshadowArray=[];
	uselessArray=[];
	bsindexArray=[];
	isCheat=false;
	var t1=1;
	var t2=1;
	var gao=1;
	eye[0]=-1;
	eye[1]=data.length-1.5;
	eye[2]=0.5;
	at[0]=3;
	at[1]=eye[1];
	at[2]=0.5;
	generateCircle(eye[0],eye[1],eye[2]);
	pathArray.push(eye[0],eye[1],0.3);
	endArray.push(size*2,data.length+1-2*size,0.001);
	endArray.push(size*2,data.length-2*size,0.001);
	endArray.push(size*2+1,data.length-2*size,0.001);
	endArray.push(size*2,data.length+1-2*size,0.001);
	endArray.push(size*2+1,data.length-2*size,0.001);
	endArray.push(size*2+1,data.length+1-2*size,0.001);
	
	startArray.push(0,data.length-1,0.001);
	startArray.push(0,data.length-2,0.001);
	startArray.push(1,data.length-2,0.001);
	startArray.push(0,data.length-1,0.001);
	startArray.push(1,data.length-2,0.001);
	startArray.push(1,data.length-1,0.001);
	
	for(var i=0;i<6*data.length*data.length;++i){
		indexArray.push(texCoord[0],texCoord[1],texCoord[2],texCoord[0],texCoord[2],texCoord[3]);
	}
	for(var i=0;i<data.length;++i){
		for(var j=0;j<data[i].length;++j){
			var ltx=j;
			var lty=data.length-i;
			if(data[i][j].value==1){//road
				roadArray.push(ltx,lty,0);
				roadArray.push(ltx,lty-t1,0);
				roadArray.push(ltx+t2,lty-t1,0);
				roadArray.push(ltx,lty,0);
				roadArray.push(ltx+t2,lty-t1,0);
				roadArray.push(ltx+t2,lty,0);
				for(var k=0;k<6;++k)
					rnArray.push(normals[5]);
			}else{//block
				//底面
				blockArray.push(ltx,lty,0);
				blockArray.push(ltx,lty-t1,0);
				blockArray.push(ltx+t2,lty-t1,0);
				blockArray.push(ltx,lty,0);
				blockArray.push(ltx+t2,lty-t1,0);
				blockArray.push(ltx+t2,lty,0);
				for(var k=0;k<6;++k)
					bnArray.push(normals[4]);
				
				//顶面
				blockArray.push(ltx+t2,lty,gao);
				blockArray.push(ltx+t2,lty-t1,gao);
				blockArray.push(ltx,lty-t1,gao);
				blockArray.push(ltx+t2,lty,gao);
				blockArray.push(ltx,lty-t1,gao);
				blockArray.push(ltx,lty,gao);
				for(var k=0;k<6;++k)
					bnArray.push(normals[5]);
				//计算顶面与光照在地面形成的影子，四条边共计算四个四边形,24个顶点
				//因为影子采用半透明滤镜，为避免重叠，只计算阴影面且并未被遮挡面产生的影子
				//计算产生在墙面上的阴影，生成顶点数组和纹理坐标数组，即填充bsindexArray,boxshadowArray两个数组
				
				//(ltx+t2,lty,gao),(ltx+t2,lty,0),(ltx+t2,lty-t1,gao),(ltx+t2,lty-t1,0)平面,法线为(1,0,0)
				if(dot(lightPosition,vec4(1,0,0,0))<0&&(j==data.length-1||data[i][j+1].value!=0)){
					shadowArray.push(ltx+t2,lty-t1,0.01);
					shadowArray.push(ltx+t2,lty,0.01);
					shadowArray.push(ltx+t2-(lightPosition[0]-ltx-t2)/(lightPosition[2]-1),lty-t1-(lightPosition[1]-lty+t1)/(lightPosition[2]-1),0.01);
					shadowArray.push(ltx+t2,lty,0.01);
					shadowArray.push(ltx+t2-(lightPosition[0]-ltx-t2)/(lightPosition[2]-1),lty-t1-(lightPosition[1]-lty+t1)/(lightPosition[2]-1),0.01);
					shadowArray.push(ltx+t2-(lightPosition[0]-ltx-t2)/(lightPosition[2]-1),lty-(lightPosition[1]-lty)/(lightPosition[2]-1),0.01);
					
					if((lightPosition[1]-lty+t1)/(lightPosition[2]-1)<0){//投影在右上
						if(i>0&&j<data.length-1&&data[i-1][j+1].value!=1&&dot(lightPosition,vec4(0,-1,0,0))>0){
							boxshadowArray.push(ltx+t2,lty-0.01,gao);
							boxshadowArray.push(ltx+t2,lty-0.01,0);
							boxshadowArray.push(ltx+t2-(lightPosition[0]-ltx-t2)/(lightPosition[2]-1),lty-0.01,0);
							bsindexArray.push(vec2(0,0));
							bsindexArray.push(vec2(0,1));
							bsindexArray.push(vec2(-(lightPosition[0]-ltx-t2)/(lightPosition[2]-1),1));
						}
					}else{//投影在右下
						if(i<data.length-1&&j<data.length-1&&data[i+1][j+1].value!=1&&dot(lightPosition,vec4(0,1,0,0))>0){
							boxshadowArray.push(ltx+t2,lty-t1+0.01,gao);
							boxshadowArray.push(ltx+t2,lty-t1+0.01,0);
							boxshadowArray.push(ltx+t2-(lightPosition[0]-ltx-t2)/(lightPosition[2]-1),lty-t1+0.01,0);
							bsindexArray.push(vec2(1,0));
							bsindexArray.push(vec2(1,1));
							bsindexArray.push(vec2(1+(lightPosition[0]-ltx-t2)/(lightPosition[2]-1),1));
						}
					}
				}
				
				//(ltx+t2,lty-t1,gao),(ltx+t2,lty-t1,0),(ltx,lty-t1,gao),(ltx,lty-t1,0)平面,法线为(0,-1,0)
				if(dot(lightPosition,vec4(0,-1,0,0))<0&&(i==data.length-1||data[i+1][j].value!=0)){
					shadowArray.push(ltx,lty-t1,0.01);
					shadowArray.push(ltx+t2,lty-t1,0.01);
					shadowArray.push(ltx-(lightPosition[0]-ltx)/(lightPosition[2]-1),lty-t1-(lightPosition[1]-lty+t1)/(lightPosition[2]-1),0.01);
					shadowArray.push(ltx+t2,lty-t1,0.01);
					shadowArray.push(ltx-(lightPosition[0]-ltx)/(lightPosition[2]-1),lty-t1-(lightPosition[1]-lty+t1)/(lightPosition[2]-1),0.01);
					shadowArray.push(ltx+t2-(lightPosition[0]-ltx-t2)/(lightPosition[2]-1),lty-t1-(lightPosition[1]-lty+t1)/(lightPosition[2]-1),0.01);
					
					if((lightPosition[0]-ltx)/(lightPosition[2]-1)<0){//投影在右下
						if(i<data.length-1&&j<data.length-1&&data[i+1][j+1].value!=1&&dot(lightPosition,vec4(-1,0,0,0))>0){
							boxshadowArray.push(ltx+t2-0.01,lty-t1,gao);
							boxshadowArray.push(ltx+t2-0.01,lty-t1,0);
							boxshadowArray.push(ltx+t2-0.01,lty-t1-(lightPosition[1]-lty+t1)/(lightPosition[2]-1),0);
							bsindexArray.push(vec2(0,0));
							bsindexArray.push(vec2(0,1));
							bsindexArray.push(vec2(-(lightPosition[1]-lty+t1)/(lightPosition[2]-1),1));
						}
					}else{//投影在左下
						if(i<data.length-1&&j>0&&data[i+1][j-1].value!=1&&dot(lightPosition,vec4(1,0,0,0))>0){
							boxshadowArray.push(ltx+0.01,lty-t1,gao);
							boxshadowArray.push(ltx+0.01,lty-t1,0);
							boxshadowArray.push(ltx+0.01,lty-t1-(lightPosition[1]-lty+t1)/(lightPosition[2]-1),0);
							bsindexArray.push(vec2(1,0));
							bsindexArray.push(vec2(1,1));
							bsindexArray.push(vec2(1+(lightPosition[1]-lty+t1)/(lightPosition[2]-1),1));
						}
					}
				}
				
				//(ltx,lty-t1,gao),(ltx,lty-t1,0),(ltx,lty,gao),(ltx,lty,0)平面,法线为(-1,0,0)
				if(dot(lightPosition,vec4(-1,0,0,0))<0&&(j==0||data[i][j-1].value!=0)){
					shadowArray.push(ltx,lty,0.01);
					shadowArray.push(ltx,lty-t1,0.01);
					shadowArray.push(ltx-(lightPosition[0]-ltx)/(lightPosition[2]-1),lty-(lightPosition[1]-lty)/(lightPosition[2]-1),0.01);
					shadowArray.push(ltx,lty-t1,0.01);
					shadowArray.push(ltx-(lightPosition[0]-ltx)/(lightPosition[2]-1),lty-(lightPosition[1]-lty)/(lightPosition[2]-1),0.01);
					shadowArray.push(ltx-(lightPosition[0]-ltx)/(lightPosition[2]-1),lty-t1-(lightPosition[1]-lty+t1)/(lightPosition[2]-1),0.01);
					
					if((lightPosition[1]-lty)/(lightPosition[2]-1)<0){//投影在左上
						if(i>0&&j>0&&data[i-1][j-1].value!=1&&dot(lightPosition,vec4(0,-1,0,0))>0){
							boxshadowArray.push(ltx,lty-0.01,gao);
							boxshadowArray.push(ltx,lty-0.01,0);
							boxshadowArray.push(ltx-(lightPosition[0]-ltx)/(lightPosition[2]-1),lty-0.01,0);
							bsindexArray.push(vec2(1,0));
							bsindexArray.push(vec2(1,1));
							bsindexArray.push(vec2(1-(lightPosition[0]-ltx)/(lightPosition[2]-1),1));
						}
					}else{//投影在左下
						if(i<data.length-1&&j>0&&data[i+1][j-1].value!=1&&dot(lightPosition,vec4(0,1,0,0))>0){
							boxshadowArray.push(ltx,lty-t1+0.01,gao);
							boxshadowArray.push(ltx,lty-t1+0.01,0);
							boxshadowArray.push(ltx-(lightPosition[0]-ltx)/(lightPosition[2]-1),lty-t1+0.01,0);
							bsindexArray.push(vec2(0,0));
							bsindexArray.push(vec2(0,1));
							bsindexArray.push(vec2((lightPosition[0]-ltx)/(lightPosition[2]-1),1));
						}
					}
				}
				
				//(ltx+t2,lty,gao),(ltx+t2,lty,0),(ltx,lty,gao),(ltx,lty,0)平面,法线为(0,1,0)
				if(dot(lightPosition,vec4(0,1,0,0))<0&&(i==0||data[i-1][j].value!=0)){
					shadowArray.push(ltx,lty,0.01);
					shadowArray.push(ltx+t2,lty,0.01);
					shadowArray.push(ltx+t2-(lightPosition[0]-ltx-t2)/(lightPosition[2]-1),lty-(lightPosition[1]-lty)/(lightPosition[2]-1),0.01);
					shadowArray.push(ltx,lty,0.01);
					shadowArray.push(ltx+t2-(lightPosition[0]-ltx-t2)/(lightPosition[2]-1),lty-(lightPosition[1]-lty)/(lightPosition[2]-1),0.01);
					shadowArray.push(ltx-(lightPosition[0]-ltx)/(lightPosition[2]-1),lty-(lightPosition[1]-lty)/(lightPosition[2]-1),0.01);
					
					if((lightPosition[0]-ltx-t2)/(lightPosition[2]-1)>0){//投影在左上
						if(i>0&&j>0&&data[i-1][j-1].value!=1&&dot(lightPosition,vec4(1,0,0,0))>0){
							boxshadowArray.push(ltx+0.01,lty,gao);
							boxshadowArray.push(ltx+0.01,lty,0);
							boxshadowArray.push(ltx+0.01,lty-(lightPosition[1]-lty)/(lightPosition[2]-1),0);
							bsindexArray.push(vec2(0,0));
							bsindexArray.push(vec2(0,1));
							bsindexArray.push(vec2(-(lightPosition[1]-lty)/(lightPosition[2]-1),1));
						}
					}else{//投影在右上
						if(i>0&&j<data.length-1&&data[i-1][j+1].value!=1&&dot(lightPosition,vec4(-1,0,0,0))>0){
							boxshadowArray.push(ltx+t2-0.01,lty,gao);
							boxshadowArray.push(ltx+t2-0.01,lty,0);
							boxshadowArray.push(ltx+t2-0.01,lty-(lightPosition[1]-lty)/(lightPosition[2]-1),0);
							bsindexArray.push(vec2(1,0));
							bsindexArray.push(vec2(1,1));
							bsindexArray.push(vec2(1-(lightPosition[1]-lty)/(lightPosition[2]-1),1));
						}
					}
				}
				for(var k=0;k<24;++k){
					uselessArray.push(0,0,0);
				}
				
				//左侧面
				blockArray.push(ltx,lty,gao);
				blockArray.push(ltx,lty,0);
				blockArray.push(ltx,lty-t1,0);
				blockArray.push(ltx,lty,gao);
				blockArray.push(ltx,lty-t1,0);
				blockArray.push(ltx,lty-t1,gao);
				for(var k=0;k<6;++k)
					bnArray.push(normals[3]);
				
				//右侧面
				blockArray.push(ltx+t2,lty,gao);
				blockArray.push(ltx+t2,lty,0);
				blockArray.push(ltx+t2,lty-t1,0);
				blockArray.push(ltx+t2,lty,gao);
				blockArray.push(ltx+t2,lty-t1,0);
				blockArray.push(ltx+t2,lty-t1,gao);
				for(var k=0;k<6;++k)
					bnArray.push(normals[1]);
				
				//正面
				blockArray.push(ltx+t2,lty,gao);
				blockArray.push(ltx+t2,lty,0);
				blockArray.push(ltx,lty,0);
				blockArray.push(ltx+t2,lty,gao);
				blockArray.push(ltx,lty,0);
				blockArray.push(ltx,lty,gao);
				for(var k=0;k<6;++k)
					bnArray.push(normals[0]);
				
				//反面
				blockArray.push(ltx+t2,lty-t1,gao);
				blockArray.push(ltx+t2,lty-t1,0);
				blockArray.push(ltx,lty-t1,0);
				blockArray.push(ltx+t2,lty-t1,gao);
				blockArray.push(ltx,lty-t1,0);
				blockArray.push(ltx,lty-t1,gao);
				for(var k=0;k<6;++k)
					bnArray.push(normals[2]);
			}
		}
	}
	rbuffer=gl.createBuffer(); //3,float
	gl.bindBuffer(gl.ARRAY_BUFFER, rbuffer);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(roadArray), gl.STATIC_DRAW);
	
	bbuffer=gl.createBuffer(); //3,float
	gl.bindBuffer(gl.ARRAY_BUFFER, bbuffer);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(blockArray), gl.STATIC_DRAW);
	
	ibuffer=gl.createBuffer(); //2,float
	gl.bindBuffer(gl.ARRAY_BUFFER, ibuffer);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(indexArray), gl.STATIC_DRAW);
	
	sbuffer=gl.createBuffer(); //3,float
	gl.bindBuffer(gl.ARRAY_BUFFER, sbuffer);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(startArray), gl.STATIC_DRAW);
	
	ebuffer=gl.createBuffer(); //3,float
	gl.bindBuffer(gl.ARRAY_BUFFER, ebuffer);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(endArray), gl.STATIC_DRAW);
	
	cbuffer=gl.createBuffer(); //3,float
	gl.bindBuffer(gl.ARRAY_BUFFER, cbuffer);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(circleArray), gl.STATIC_DRAW);
	
	pbuffer=gl.createBuffer(); //3,float
	gl.bindBuffer(gl.ARRAY_BUFFER, pbuffer);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(pathArray), gl.STATIC_DRAW);
	
	rnbuffer=gl.createBuffer(); //3,float
	gl.bindBuffer(gl.ARRAY_BUFFER, rnbuffer);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(rnArray), gl.STATIC_DRAW);
	
	bnbuffer=gl.createBuffer(); //3,float
	gl.bindBuffer(gl.ARRAY_BUFFER, bnbuffer);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(bnArray), gl.STATIC_DRAW);
	
	shadowBuffer=gl.createBuffer(); //3,float
	gl.bindBuffer(gl.ARRAY_BUFFER, shadowBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(shadowArray), gl.STATIC_DRAW);
	
	boxshadowBuffer=gl.createBuffer(); //3,float
	gl.bindBuffer(gl.ARRAY_BUFFER, boxshadowBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(boxshadowArray), gl.STATIC_DRAW);
	
	uselessBuffer=gl.createBuffer(); //3,float
	gl.bindBuffer(gl.ARRAY_BUFFER, uselessBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(uselessArray), gl.STATIC_DRAW);
	
	bsindexBuffer=gl.createBuffer(); //2,float
	gl.bindBuffer(gl.ARRAY_BUFFER, bsindexBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(bsindexArray), gl.STATIC_DRAW);

	vpLoc = gl.getAttribLocation( program, "vPosition");
	inuvLoc = gl.getAttribLocation( program, "inUV");
	textureLoc = gl.getUniformLocation(program,"texture");
	typeLoc = gl.getUniformLocation( program, "type" );
	vnLoc=gl.getAttribLocation(program,"vNormal");
	modelViewMatrixLoc = gl.getUniformLocation( program, "modelViewMatrix" );
    projectionMatrixLoc = gl.getUniformLocation( program, "projectionMatrix" );

    gl.enableVertexAttribArray(vpLoc);
	gl.enableVertexAttribArray(inuvLoc);
	gl.enableVertexAttribArray(vnLoc);
	
	var image1 = new Image();
    image1.onload = function () {
        textureFloor = gl.createTexture();
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); 
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, textureFloor);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image1);
        gl.uniform1i(textureLoc, 0);
    };
    image1.src = 'img/road.jpg';
	
	var image2 = new Image();
    image2.onload = function () {
        textureWall = gl.createTexture();
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); 
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, textureWall);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image2);
        gl.uniform1i(textureLoc, 0);
    };
    image2.src = 'img/box.jpg';
}
//生成迷宫按钮响应函数
function generate(){
	var s=$("#size").val();
	if(s!=""){
		size=s;
	}
	initData();
	render();
}

function render()
{
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	
    modelViewMatrix = lookAt( eye, at, up );
    projectionMatrix = perspective(fovy, aspect, near, far);
	
	gl.uniformMatrix4fv( modelViewMatrixLoc, false, flatten(modelViewMatrix) );
    gl.uniformMatrix4fv( projectionMatrixLoc, false, flatten(projectionMatrix) );
    
	gl.uniform1f(typeLoc,0);
	gl.bindBuffer(gl.ARRAY_BUFFER, ibuffer);
    gl.vertexAttribPointer(inuvLoc, 2, gl.FLOAT, false, 0, 0);
	
	//画墙
	gl.bindBuffer(gl.ARRAY_BUFFER, bbuffer);
    gl.vertexAttribPointer(vpLoc, 3, gl.FLOAT, false, 0, 0);
	gl.bindBuffer(gl.ARRAY_BUFFER, bnbuffer);
    gl.vertexAttribPointer(vnLoc, 3, gl.FLOAT, false, 0, 0);
	gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textureWall);
	
    gl.drawArrays( gl.TRIANGLES, 0, blockArray.length/3 );
	
	//禁止深度缓冲区写
	//为了实现半透明
	gl.depthMask(false);
	//画路
	gl.bindBuffer(gl.ARRAY_BUFFER, rbuffer);
    gl.vertexAttribPointer(vpLoc, 3, gl.FLOAT, false, 0, 0);
	gl.bindBuffer(gl.ARRAY_BUFFER, rnbuffer);
    gl.vertexAttribPointer(vnLoc, 3, gl.FLOAT, false, 0, 0);
	gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textureFloor);
	
    gl.drawArrays( gl.TRIANGLES, 0, roadArray.length/3 );
	
	//画起点
	gl.uniform1f(typeLoc,1);
	gl.bindBuffer(gl.ARRAY_BUFFER, sbuffer);
    gl.vertexAttribPointer(vpLoc, 3, gl.FLOAT, false, 0, 0);
	
    gl.drawArrays( gl.TRIANGLES, 0, startArray.length/3 );
	   
	//画终点
	gl.uniform1f(typeLoc,2);
	gl.bindBuffer(gl.ARRAY_BUFFER, ebuffer);
    gl.vertexAttribPointer(vpLoc, 3, gl.FLOAT, false, 0, 0);
	
    gl.drawArrays( gl.TRIANGLES, 0, endArray.length/3 );
	
	//打开深度缓冲区写
	gl.depthMask(true);
	
	//画阴影
	gl.uniform1f(typeLoc,4);
	gl.bindBuffer(gl.ARRAY_BUFFER, shadowBuffer);
    gl.vertexAttribPointer(vpLoc, 3, gl.FLOAT, false, 0, 0);
	gl.bindBuffer(gl.ARRAY_BUFFER, uselessBuffer);
    gl.vertexAttribPointer(vnLoc, 3, gl.FLOAT, false, 0, 0);
	
    gl.drawArrays( gl.TRIANGLES, 0, shadowArray.length/3 );
	
	gl.uniform1f(typeLoc,5);
	gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textureWall);
	gl.bindBuffer(gl.ARRAY_BUFFER, boxshadowBuffer);
    gl.vertexAttribPointer(vpLoc, 3, gl.FLOAT, false, 0, 0);
	gl.bindBuffer(gl.ARRAY_BUFFER, bsindexBuffer);
    gl.vertexAttribPointer(inuvLoc, 2, gl.FLOAT, false, 0, 0);
	
    gl.drawArrays( gl.TRIANGLES, 0, boxshadowArray.length/3 );
	
	if(isCheat){
		gl.bindBuffer(gl.ARRAY_BUFFER, uselessBuffer);
		gl.vertexAttribPointer(inuvLoc, 2, gl.FLOAT, false, 0, 0);
		//画球
		gl.uniform1f(typeLoc,2);
		gl.bindBuffer(gl.ARRAY_BUFFER, cbuffer);
		gl.bufferData(gl.ARRAY_BUFFER, flatten(circleArray), gl.STATIC_DRAW);
		gl.vertexAttribPointer(vpLoc, 3, gl.FLOAT, false, 0, 0);
		for(var i=0;i<h_c-1;++i){
			gl.drawArrays(gl.LINE_LOOP,i*v_c,v_c);
		}
		for(var i=0;i<v_c;++i){
			gl.drawArrays(gl.LINE_STRIP,(h_c-1)*v_c+i*(h_c+1),h_c+1);
		}
		
		//画路径
		gl.uniform1f(typeLoc,3);
		gl.bindBuffer(gl.ARRAY_BUFFER, pbuffer);
		gl.bufferData(gl.ARRAY_BUFFER, flatten(pathArray), gl.STATIC_DRAW);
		gl.vertexAttribPointer(vpLoc, 3, gl.FLOAT, false, 0, 0);
		gl.drawArrays(gl.LINE_STRIP,0,pathArray.length/3);
	}
    requestAnimFrame(render);
}

function random(k) {
    return Math.floor(Math.random() * k);
};

function genMaze (col,row,start,end) {
    var mazeDataArray = [];
    for (let i = 0; i < 2 * col + 1; i++) {
        let arr = [];
        for (let j = 0; j < 2 * row + 1; j++) {
            if (i % 2 == 0 || j % 2 == 0) {
                arr.push({
                    value: 0,
                    i: i,
                    j: j
                });
            } else {
                arr.push({
                    value: 1,
                    isVisited: false,
                    i: i,
                    j: j
                });
            }
        }
        mazeDataArray[i] = arr;
    }
    let currentNode = mazeDataArray[2 * random(row) + 1][2 * random(col) + 1];
    currentNode.isVisited = true;
    // 访问过的节点列表
    let visitedList = [];
    visitedList.push(currentNode);
    while (currentNode.isVisited) {
        let upNode = mazeDataArray[currentNode.i - 2] ? mazeDataArray[currentNode.i - 2][currentNode.j] : {isVisited: true};
        let rightNode = mazeDataArray[currentNode.j + 2] ? mazeDataArray[currentNode.i][currentNode.j + 2] : {isVisited: true};
        let downNode = mazeDataArray[currentNode.i + 2] ? mazeDataArray[currentNode.i + 2][currentNode.j] : {isVisited: true};
        let leftNode = mazeDataArray[currentNode.j - 2] ? mazeDataArray[currentNode.i][currentNode.j - 2] : {isVisited: true};

        let neighborArray = [];
        if (!upNode.isVisited) {
            neighborArray.push(upNode);
        }
        if (!rightNode.isVisited) {
            neighborArray.push(rightNode);
        }
        if (!downNode.isVisited) {
            neighborArray.push(downNode);
        }
        if (!leftNode.isVisited) {
            neighborArray.push(leftNode);
        }
        // 在这些格子中随机选择一个没有在访问列表中的格子，
        // 如果找到，则把该格子和当前访问的格子中间的墙打通(置为0)，
        if (neighborArray.length !== 0) { // 如果找到
            let neighborNode = neighborArray[random(neighborArray.length)];
            mazeDataArray[(neighborNode.j + currentNode.j) / 2][(neighborNode.i + currentNode.i) / 2].value = 1;
            neighborNode.isVisited = true;
            visitedList.push(neighborNode);
            currentNode = neighborNode;
        } else {
            // 把该格子作为当前访问的格子，并放入访问列表。
            // 如果周围所有的格子都已经访问过，则从已访问的列表中，随机选取一个作为当前访问的格子。
            currentNode = visitedList[random(visitedList.length)];
            if (!currentNode) {
                break;
            }
            currentNode.isVisited = true;
            // 从 visitedList 中删除随机出来的当前节点
            let tempArr = [];
			for(var k=0;k<visitedList.length;++k){
				if(visitedList[k]!==currentNode){
					tempArr.push(visitedList[k]);
				}
			}
            /*visitedList.forEach(item => {
                if (item !== currentNode) {
                    tempArr.push(item);
                }
            });*/
            visitedList = tempArr;
        }
    }
    mazeDataArray[start[0]][start[1]] = {
        i: start[0],
        j: start[1],
        value: 1
    };
    mazeDataArray[end[0]][end[1]] = {
        i: end[0],
        j: end[1],
        value: 1
    };
	return mazeDataArray;
};

