"""
URL configuration for rtsppy project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
import os
from django.contrib import admin
from django.urls import path, include, re_path
from rest_framework.routers import DefaultRouter
from stream.views import StreamViewSet
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView
from django.views.static import serve

# Create a router for REST API
router = DefaultRouter()
router.register(r'streams', StreamViewSet)
FRONTEND_DIST = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'ui', 'dist')

print("AYOAYOAYOAOY" , FRONTEND_DIST)


urlpatterns = [
    #Serve Index.html 
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    
    # API Schema documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),


    # # Static files (JS, CSS, etc.)
    # re_path(r'^assets/(?P<path>.*)$', serve, {'document_root': os.path.join(FRONTEND_DIST, 'assets')}),

    # # Catch-all route to serve index.html for React SPA
    # re_path(r'^.*$', serve, {'path': 'index.html', 'document_root': FRONTEND_DIST}),
]
