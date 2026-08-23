using Bookmachs.Refactored.Api.Infrastructure.Services;
using Microsoft.AspNetCore.Hosting;
using System;
using System.IO;
using System.Threading.Tasks;

namespace Bookmachs.Refactored.Api.Infrastructure.Services;

public class LocalFileStorageService : IFileStorageService
{
    private readonly IWebHostEnvironment _environment;

    public LocalFileStorageService(IWebHostEnvironment environment)
    {
        _environment = environment;
    }

    public async Task<string> SaveFileAsync(Stream fileStream, string fileName, string folderName)
    {
        // Obtener ruta absoluta de wwwroot
        var webRootPath = _environment.WebRootPath;
        if (string.IsNullOrEmpty(webRootPath))
        {
            // Fallback por si no está inicializada (por ejemplo en tests)
            webRootPath = Path.Combine(_environment.ContentRootPath, "wwwroot");
        }

        var folderPath = Path.Combine(webRootPath, folderName);
        if (!Directory.Exists(folderPath))
        {
            Directory.CreateDirectory(folderPath);
        }

        // Generar un nombre único para evitar colisiones
        var uniqueFileName = $"{Guid.NewGuid()}_{Path.GetFileName(fileName)}";
        var filePath = Path.Combine(folderPath, uniqueFileName);

        // Guardar el flujo del archivo físicamente en el disco
        using (var outputStream = new FileStream(filePath, FileMode.Create))
        {
            await fileStream.CopyToAsync(outputStream);
        }

        // Retorna la ruta relativa de acceso web para guardarla en BD. Ejemplo: "/uploads/guid_archivo.jpg"
        return $"/{folderName}/{uniqueFileName}";
    }

    public async Task<string> SaveSecureUserAvatarAsync(Guid userId, Stream fileStream, string fileName)
    {
        // 1. Ubicación privada segura fuera de wwwroot: App_Data/avatars/{userId}
        var appDataFolder = Path.Combine(_environment.ContentRootPath, "App_Data", "avatars", userId.ToString());

        if (!Directory.Exists(appDataFolder))
        {
            Directory.CreateDirectory(appDataFolder);
        }
        else
        {
            // 2. Borrar imágenes anteriores del usuario para conservar únicamente la activa
            var existingFiles = Directory.GetFiles(appDataFolder);
            foreach (var file in existingFiles)
            {
                try
                {
                    File.Delete(file);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[LocalFileStorageService] No se pudo borrar archivo avatar previo: {ex.Message}");
                }
            }
        }

        // 3. Generar un nombre seguro e identificador único por extensión
        var ext = Path.GetExtension(fileName);
        if (string.IsNullOrEmpty(ext)) ext = ".png";
        var uniqueFileName = $"{Guid.NewGuid()}{ext}";
        var filePath = Path.Combine(appDataFolder, uniqueFileName);

        using (var outputStream = new FileStream(filePath, FileMode.Create))
        {
            await fileStream.CopyToAsync(outputStream);
        }

        // Retorna la ruta del controlador que sirve la imagen de forma segura
        return $"/auth/avatar/{userId}";
    }

    public string? GetSecureUserAvatarPath(Guid userId)
    {
        var appDataFolder = Path.Combine(_environment.ContentRootPath, "App_Data", "avatars", userId.ToString());
        if (!Directory.Exists(appDataFolder))
        {
            return null;
        }

        var files = Directory.GetFiles(appDataFolder);
        return files.FirstOrDefault();
    }

    public void DeleteFile(string fileUrl)
    {
        if (string.IsNullOrEmpty(fileUrl)) return;

        var relativePath = fileUrl.TrimStart('/');
        var webRootPath = _environment.WebRootPath;
        if (string.IsNullOrEmpty(webRootPath))
        {
            webRootPath = Path.Combine(_environment.ContentRootPath, "wwwroot");
        }

        var filePath = Path.Combine(webRootPath, relativePath);
        if (File.Exists(filePath))
        {
            File.Delete(filePath);
        }
    }
}

