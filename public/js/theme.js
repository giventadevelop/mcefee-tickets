// Basic Theme JavaScript

(function($) {
    'use strict';
    
    // Document Ready
    $(document).ready(function() {
        // Initialize any sliders
        if ($.fn.owlCarousel) {
            $('.philantrop_slider').owlCarousel({
                loop: true,
                margin: 30,
                nav: true,
                dots: false,
                autoplay: true,
                autoplayTimeout: 5000,
                responsive: {
                    0: {
                        items: 1
                    },
                    600: {
                        items: 2
                    },
                    1000: {
                        items: 3
                    }
                }
            });
        }
        
        // Initialize isotope for filtering
        if ($.fn.isotope) {
            var $grid = $('.philantrop_isotope_grid').isotope({
                itemSelector: '.philantrop_isotope_item',
                layoutMode: 'fitRows'
            });
            
            $('.philantrop_filter_buttons').on('click', 'button', function() {
                var filterValue = $(this).attr('data-filter');
                $grid.isotope({ filter: filterValue });
                $('.philantrop_filter_buttons button').removeClass('active');
                $(this).addClass('active');
            });
        }
        
        // Smooth scroll for anchor links
        $('a[href*="#"]:not([href="#"])').click(function() {
            if (location.pathname.replace(/^\//, '') == this.pathname.replace(/^\//, '') && location.hostname == this.hostname) {
                var target = $(this.hash);
                target = target.length ? target : $('[name=' + this.hash.slice(1) + ']');
                if (target.length) {
                    $('html, body').animate({
                        scrollTop: target.offset().top - 100
                    }, 1000);
                    return false;
                }
            }
        });
        
        // Mobile menu toggle
        $('.philantrop_mobile_menu_button').on('click', function() {
            $('.philantrop_mobile_menu_container').toggleClass('active');
            $(this).toggleClass('active');
        });
        
        // Add animation on scroll
        $(window).scroll(function() {
            var scrollPosition = $(this).scrollTop();
            
            // Add fixed header on scroll
            if (scrollPosition > 100) {
                $('.philantrop_header').addClass('fixed');
            } else {
                $('.philantrop_header').removeClass('fixed');
            }
            
            // Animate elements on scroll
            $('.animate-on-scroll').each(function() {
                var elementPosition = $(this).offset().top;
                var windowHeight = $(window).height();
                
                if (scrollPosition > elementPosition - windowHeight + 100) {
                    $(this).addClass('animated');
                }
            });
        });
    });
    
    // Window Load
    $(window).on('load', function() {
        // Hide preloader
        $('.philantrop_preloader').fadeOut(500);
    });
    
})(jQuery);
