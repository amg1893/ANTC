$(document).ready(function(){

	updateTrads();
	updateBackground();
	updateClock();
	updateGreetings();
	updateWeather();
	
	$('#weather, #miniweather').on('click', function(e){
		$('#weather, #miniweather').toggle();
	});
	$('#settingsButton').on('click', function(e){
		$(this).hide();
		$('#settings').css('left', 0);
	});
	$('#close-settings').on('click', function(e){
		$('#settings').css('left', '').on('transitionend', function(){
			if(parseInt($('#settings').css('left')) < 0) {
				$('#settingsButton').show();
			}
		});
	});
	$('input[name="location"]').on('keypress', function(e){
		if(e.which == 13) {
			setLocation(this.value);
		}
	});
	$('input[name="name"]').on('keydown', function(e){
		changeName(e, this.value)
	});
	$('#deleteData').on('click', function(e){
		var c = confirm('All data will be deleted. Do you wish to continue?');
		if(c) {
			deleteAllStorage();
		}
	});
	$("#settings input[type='checkbox']").click(function(){		
		setInStorage($(this).attr('name'), $(this).is(":checked"));
	});

	// SETTINGS
	if(typeof chrome.app != 'undefined') {
		var author = chrome.app.getDetails().author;
		var version = chrome.app.getDetails().version_name;
		$("#footer").html(author + " ~ " + version);
	}

});

$(document).mouseup(function(e) 
{
    var container = $("#weather");

	// if the target of the click isn't the container nor a descendant of the container
    if (!$("#weather").is(e.target) && $("#weather").has(e.target).length === 0 && $("#weather").is(':visible')) {
        $("#weather").click();
    } else if(!$("#settings").is(e.target) && $("#settings").has(e.target).length === 0 && parseInt($("#settings").css('left')) == 0) {
		$('#close-settings').click();
	}
});

// ================ MAIN FUNCTIONS ================

function updateBackground() {
	getFromStorage('background', function(data){
		if(isInStorage(data, 'background')) {
			// Tengo fondo, se pone
			$('#background').css('background-image', 'url("'+data.background.img+'")').waitForImages(function() {
				$('#background').addClass('show');
				cacheBackground(false);
			}, $.noop, true);
		} else {
			cacheBackground(true);
		}
	});
}

function updateClock() {
    var now = new Date(); // current date
	time = ("0" + now.getHours()).slice(-2) + ' : ' + ("0" + now.getMinutes()).slice(-2) + ' : ' + ("0" + now.getSeconds()).slice(-2);
    $('#clock h1').html(time);
    setTimeout(updateClock, 1000);
}

function updateGreetings() {
	var now = new Date();
	var hour = now.getHours();
	var message = '';
	if(hour >= 5 && hour < 12) {
		message = getTrad("greetingsMorning");
	} else if(hour >= 12 && hour < 21) {
		message = getTrad("greetingsAfternoon");
	} else if(hour >= 21 || hour < 5) {
		message = getTrad("greetingsEvening");
	}
	getFromStorage('username',function(data){
		if(isInStorage(data, 'username')) {
			$('#greetings').html(message+', '+data.username);
			$('input[name="name"]').val(data.username);
		} else {
			var input = $('<input />');
			input.on('keydown', function(e){
				changeName(e, this.value)
			});
			$('#greetings').html(message+', ');
			$('#greetings').append(input);
			$('input[name="name"]').val('');
		}
	});

	getFromStorage('extendWeather',function(data){
		if(data.extendWeather !== undefined && data.extendWeather === true) {
			$("#settings input[name='extendWeather']").click();
		}
	});

	
}

function updateWeather() {
	var path = "https://api.openweathermap.org/data/2.5/weather?appid=45dc870e41c6c3980d4d1e446bf6d079&units=metric&lang=es";

	getFromStorage('location',function(data){
		if(isInStorage(data, 'location')) {
			$('input[name="location"]').val(data.location);
			var url = path + '&q=' + data.location;
			setHTMLWeather(url);
		} else {
			getLocation(function(pos){
				var url = path + "&lat=" + pos.latitude + "&lon=" + pos.longitude;
				setHTMLWeather(url);
			});
		}
	});
}

function setHTMLWeather(url) {
	$.get({
		url: url,
	}).done(function(response){
		$('#location').text(response.name);
		$('#tempnow').text(normalizeTemp(response.main.temp));
		$('#others').text(normalizeTemp(response.main.temp_min)+' / '+normalizeTemp(response.main.temp_max));
		response.weather.forEach(function(value, key){
			console.info("Weather: "+value.description+" ("+value.id+")");
			$('#summary').prepend('<i class="wi '+getWeatherIcon(value.id)+'"></i>');
			$('#miniweather').prepend('<i class="wi '+getWeatherIcon(value.id)+'"></i>');
		});
		$('#humidity').text(response.main.humidity+" ");

		$('#windSpeed > span').text(response.wind.speed);
		var dir = getWindDirection(response.wind.deg);
		$('#windSpeed > i').addClass("towards-"+dir+"-deg");
		
		$('#minitemp').text(normalizeTemp(response.main.temp));

		getFromStorage('extendWeather',function(data){
			if(data.extendWeather !== undefined && data.extendWeather === true) {
				$('#weather').show();
				$('#miniweather').hide();
			} else {
				$('#miniweather').show();
				$('#weather').hide();
			}
		});
	});
}

// ================ GETTERS ================

function getLocation(callback) {
	if (navigator.geolocation) {
		navigator.geolocation.getCurrentPosition(function(position){
			callback(position.coords);
		});
	} else {
		console.info( "Geolocation is not supported by this chrome.");
	}
}

function getWeatherIcon(id) {
	
	var icons = [];

	//https://openweathermap.org/weather-conditions
	//https://erikflowers.github.io/weather-icons/

	icons[200] = "wi-storm-showers";
	icons[211] = "wi-thunderstorm";
	icons[520] = "wi-hail";
	icons[521] = "wi-rain";
	icons[522] = "wi-rain";
	icons[800] = "wi-sunny";
	icons[801] = "wi-cloudy";

	if(icons[id] == undefined) {
		return "wi-alien";
	}
	return icons[id];
}

function getFromStorage(field, callback) {
	chrome.storage.local.get(field,callback);
}

function getTrad(key) {
	return chrome.i18n.getMessage(key);
}

// ================ SETTERS ================

function setInStorage(field, value, callback) {
	var obj = {};
	obj[field] = value;
	chrome.storage.local.set(obj,callback);
}

function cacheBackground(reload = false) {
	var photo = new UnsplashPhoto();
	var url = photo.fromCategory('nature').size(1920,1080).fetch();

	var xhr = new XMLHttpRequest();
    xhr.onload = function() {
        var reader = new FileReader();
        reader.onloadend = function() {

			var now = new Date();
			setInStorage('background', {img: reader.result, timestamp: now.getTime()},function() {
				if(reload) {
					updateBackground();
				}
			});
        }
        reader.readAsDataURL(xhr.response);
    };
    xhr.open('GET', url);
    xhr.responseType = 'blob';
    xhr.send();
}

function setLocation(location) {
	setInStorage('location', location, function(){
		updateWeather();
	});
}

function changeName(e, value) {
	if (e.keyCode == 13) {
		setInStorage('username', value, function(setData){
			updateGreetings();
		});
	}
}

// ================ UTIL ================

function isInStorage(data, field) {
	return data && typeof data[field] !== 'undefined' && ((typeof data[field] == 'string' && data[field] != '') || (typeof data[field] == 'object' && !$.isEmptyObject(data[field])));
}

function normalizeTemp(temp) {
	return Math.round((temp * 10)/10) + "º";
}

function deleteAllStorage() {
	setInStorage('username', '');
	setInStorage('background', {});
	setInStorage('location', '');
	location.reload();
}

function updateTrads() {
	var trads = $.find("[trad]");
	$( $.find("[trad]")).each(function(){
		var trad = getTrad($(this).attr("trad"));
		$(this).text(trad);
	});
}

function getWindDirection(value) {
	var t = Math.ceil(value / (45/2));
	return ((Math.ceil(t / 2) * 23) + (Math.floor(t / 2) * 22));
}
