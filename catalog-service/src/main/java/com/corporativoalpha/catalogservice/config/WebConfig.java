package com.corporativoalpha.catalogservice.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Autowired
    private JwtInterceptor jwtInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        // Le decimos que intercepte TODAS las peticiones a /api/spaces
        registry.addInterceptor(jwtInterceptor).addPathPatterns("/api/spaces/**");
    }
}
