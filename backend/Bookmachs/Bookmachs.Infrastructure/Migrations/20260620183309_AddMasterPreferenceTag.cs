using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Bookmachs.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMasterPreferenceTag : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MasterPreferenceTags",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterPreferenceTags", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MasterPreferenceTags_Name",
                table: "MasterPreferenceTags",
                column: "Name",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MasterPreferenceTags");
        }
    }
}
