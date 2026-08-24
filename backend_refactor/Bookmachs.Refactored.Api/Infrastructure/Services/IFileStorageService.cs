using System;
using System.IO;
using System.Threading.Tasks;

namespace Bookmachs.Refactored.Api.Infrastructure.Services;

public interface IFileStorageService
{
    /// <summary>
    /// Guarda un flujo de datos de archivo en el almacenamiento público y retorna la URL relativa de acceso.
    /// </summary>
    Task<string> SaveFileAsync(Stream fileStream, string fileName, string folderName);
    
    /// <summary>
    /// Guarda de forma segura el avatar del usuario en App_Data/avatars/{userId}/ borrando versiones anteriores.
    /// </summary>
    Task<string> SaveSecureUserAvatarAsync(Guid userId, Stream fileStream, string fileName);

    /// <summary>
    /// Obtiene la ruta física del archivo del avatar activo del usuario desde App_Data.
    /// </summary>
    string? GetSecureUserAvatarPath(Guid userId);

    /// <summary>
    /// Guarda de forma segura la portada de un libro en App_Data/books/{userId}/ sin borrar anteriores.
    /// </summary>
    Task<string> SaveSecureUserBookImageAsync(Guid userId, Stream fileStream, string fileName);

    /// <summary>
    /// Obtiene la ruta física de la portada de un libro del usuario desde App_Data.
    /// </summary>
    string? GetSecureUserBookImagePath(Guid userId, string fileName);

    /// <summary>
    /// Elimina un archivo del almacenamiento basándose en su URL relativa.
    /// </summary>
    void DeleteFile(string fileUrl);
}

