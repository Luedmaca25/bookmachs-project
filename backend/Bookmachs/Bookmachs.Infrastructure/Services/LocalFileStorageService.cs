using Bookmachs.Application.Common.Interfaces;
using Microsoft.AspNetCore.Hosting;
using System;
using System.IO;
using System.Threading.Tasks;

namespace Bookmachs.Infrastructure.Services;

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
