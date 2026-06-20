using System;

namespace Bookmachs.Application.Common.Interfaces;

public interface ICacheService
{
    /// <summary>
    /// Obtiene un valor de la caché.
    /// </summary>
    T? Get<T>(string key);
    
    /// <summary>
    /// Establece un valor en la caché con un tiempo de expiración.
    /// </summary>
    void Set<T>(string key, T value, TimeSpan expiration);
    
    /// <summary>
    /// Elimina una clave de la caché.
    /// </summary>
    void Remove(string key);
}
